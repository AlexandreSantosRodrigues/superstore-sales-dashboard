# Databricks notebook: paste this entire file into a Python cell.
# Validation protocol: train on 2015, validate on 2016, reserve 2017.
# Each prediction is one month ahead with prior observed months available.
# No hyperparameter search: fixed simple models for an honest comparison.
from pyspark.ml import Pipeline
from pyspark.ml.feature import StringIndexer, OneHotEncoder, VectorAssembler
from pyspark.ml.regression import LinearRegression, RandomForestRegressor, GBTRegressor
from pyspark.sql import functions as F

SOURCE = "workspace.default.superstore_features_month_region_category"
raw = spark.table(SOURCE)
df = raw.select(
    F.col("sales_month"),
    F.col("region"),
    F.col("category"),
    F.col("calendar_month"),
    F.col("sales").cast("double").alias("label"),
    F.col("sales_lag_1").cast("double").alias("sales_lag_1"),
    F.col("sales_lag_12").cast("double").alias("sales_lag_12"),
    F.col("sales_trailing_3").cast("double").alias("sales_trailing_3"),
).where(
    F.col("sales_lag_1").isNotNull()
    & F.col("sales_lag_12").isNotNull()
    & F.col("sales_trailing_3").isNotNull()
)

train = df.where(F.year("sales_month") == 2015)
valid = df.where(F.year("sales_month") == 2016)
assert train.count() == 144 and valid.count() == 144, "Unexpected train/validation size"

indexers = [
    StringIndexer(inputCol=c, outputCol=c + "_idx", handleInvalid="keep")
    for c in ["region", "category", "calendar_month"]
]
encoder = OneHotEncoder(
    inputCols=[c + "_idx" for c in ["region", "category", "calendar_month"]],
    outputCols=[c + "_vec" for c in ["region", "category", "calendar_month"]],
    handleInvalid="keep",
)
assembler = VectorAssembler(
    inputCols=["region_vec", "category_vec", "calendar_month_vec",
               "sales_lag_1", "sales_lag_12", "sales_trailing_3"],
    outputCol="features",
)
models = [
    ("ridge", LinearRegression(featuresCol="features", labelCol="label",
                               regParam=1.0, elasticNetParam=0.0, maxIter=100)),
    ("random_forest", RandomForestRegressor(featuresCol="features", labelCol="label",
                                             numTrees=60, maxDepth=4, seed=42)),
    ("gradient_boosted_trees", GBTRegressor(featuresCol="features", labelCol="label",
                                             maxIter=40, maxDepth=3, seed=42)),
]

rows = []
for name, estimator in models:
    fitted = Pipeline(stages=indexers + [encoder, assembler, estimator]).fit(train)
    scored = fitted.transform(valid).select(
        "category", "label",
        # Sales cannot be negative. Fixed postprocessing for all models.
        F.greatest(F.lit(0.0), F.col("prediction")).alias("predicted")
    )
    metrics = scored.groupBy("category").agg(
        F.count("*").alias("n"),
        F.avg(F.abs(F.col("label") - F.col("predicted"))).alias("mae"),
        F.sum(F.abs(F.col("label") - F.col("predicted"))).alias("abs_error"),
        F.sum("label").alias("actual_total"),
        F.sum(F.col("predicted") - F.col("label")).alias("bias")
    ).collect()
    for m in metrics:
        rows.append((
            name, m["category"], m["n"],
            round(m["mae"], 2),
            round(100 * m["abs_error"] / m["actual_total"], 2),
            round(m["bias"], 2)
        ))

result = spark.createDataFrame(
    rows, "model string, category string, observations long, "
          "mae_usd double, wape_pct double, signed_bias_usd double"
)
display(result.orderBy("category", "wape_pct"))
