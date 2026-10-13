# Databricks Python cell. Final held-out evaluation, not hyperparameter tuning.
# Train 2015–2016; test 2017. One-month-ahead rolling-origin features
# include only actual sales known before each forecasted month.
from pyspark.ml import Pipeline
from pyspark.ml.feature import StringIndexer, OneHotEncoder, VectorAssembler
from pyspark.ml.regression import LinearRegression
from pyspark.sql import functions as F

raw = spark.table("workspace.default.superstore_features_month_region_category")
df = raw.select(
    "sales_month", "region", "category", "calendar_month", "observed_in_source",
    F.col("sales").cast("double").alias("label"),
    F.col("sales_lag_1").cast("double").alias("sales_lag_1"),
    F.col("sales_lag_12").cast("double").alias("sales_lag_12"),
    F.col("sales_trailing_3").cast("double").alias("sales_trailing_3"),
).where(
    F.col("sales_lag_1").isNotNull()
    & F.col("sales_lag_12").isNotNull()
    & F.col("sales_trailing_3").isNotNull()
)
train = df.where(F.year("sales_month").isin(2015, 2016))
test = df.where(F.year("sales_month") == 2017)
assert train.count() == 288 and test.count() == 144

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
ridge = LinearRegression(
    featuresCol="features", labelCol="label",
    regParam=1.0, elasticNetParam=0.0, maxIter=100,
)
fitted = Pipeline(stages=indexers + [encoder, assembler, ridge]).fit(train)
scored = fitted.transform(test).select(
    "sales_month", "region", "category", "observed_in_source", "label",
    F.greatest(F.lit(0.0), F.col("prediction")).alias("ridge_prediction"),
    F.when(F.col("category") == "Office Supplies", F.col("sales_trailing_3"))
     .otherwise(F.col("sales_lag_12")).alias("baseline_prediction"),
)
long = scored.select(
    "sales_month", "region", "category", "observed_in_source", "label",
    F.lit("ridge").alias("model"),
    F.col("ridge_prediction").alias("predicted"),
).unionByName(scored.select(
    "sales_month", "region", "category", "observed_in_source", "label",
    F.lit("best_2016_baseline").alias("model"),
    F.col("baseline_prediction").alias("predicted"),
))
metrics = long.groupBy("model", "category").agg(
    F.count("*").alias("observations"),
    F.round(F.avg(F.abs(F.col("label") - F.col("predicted"))), 2).alias("mae_usd"),
    F.round(
        100 * F.sum(F.abs(F.col("label") - F.col("predicted")))
        / F.sum("label"), 2
    ).alias("wape_pct"),
    F.round(F.sum(F.col("predicted") - F.col("label")), 2).alias("signed_bias_usd"),
)
display(metrics.orderBy("category", "wape_pct"))

worst = long.where(F.col("model") == "ridge").select(
    "sales_month", "region", "category", "observed_in_source", "label",
    "predicted",
    F.round(F.abs(F.col("label") - F.col("predicted")), 2).alias("abs_error_usd"),
).orderBy(F.desc("abs_error_usd")).limit(10)
display(worst)
