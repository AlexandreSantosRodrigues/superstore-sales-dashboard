-- Databricks SQL. Fonte já importada; não representa um CSV bruto.
-- Granularidade: uma linha por Row ID. Não remover registros por Product ID.
CREATE OR REPLACE TABLE workspace.default.superstore_silver_order_lines
USING DELTA AS
SELECT
  CAST(`Row ID` AS BIGINT) AS order_line_id,
  TRIM(`Order ID`) AS order_id,
  CAST(`Order Date` AS DATE) AS order_date,
  CAST(`Ship Date` AS DATE) AS ship_date,
  TRIM(`Ship Mode`) AS ship_mode,
  TRIM(`Customer ID`) AS customer_id,
  TRIM(`Customer Name`) AS customer_name,
  TRIM(Segment) AS segment,
  TRIM(Country) AS country,
  TRIM(City) AS city,
  TRIM(State) AS state,
  CAST(`Postal Code` AS STRING) AS postal_code,
  TRIM(Region) AS region,
  TRIM(`Product ID`) AS source_product_id,
  TRIM(`Product Name`) AS product_name,
  SHA2(TO_JSON(NAMED_STRUCT(
    'product_id', TRIM(`Product ID`),
    'product_name', TRIM(`Product Name`)
  )), 256) AS product_key,
  TRIM(Category) AS category,
  TRIM(`Sub-Category`) AS subcategory,
  CAST(Sales AS DECIMAL(18,4)) AS sales,
  CAST(Quantity AS INT) AS quantity,
  CAST(Discount AS DECIMAL(6,4)) AS discount,
  CAST(Profit AS DECIMAL(18,4)) AS profit,
  INSTR(`Product Name`, '�') > 0 AS has_replacement_character
FROM workspace.default.sample_superstore;
