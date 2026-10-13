-- Execute após 01_silver.sql. Cada resultado deve ser PASSOU.
WITH source_metrics AS (
  SELECT COUNT(*) AS rows_count,
         ROUND(SUM(Sales),2) AS sales,
         ROUND(SUM(Profit),2) AS profit
  FROM workspace.default.sample_superstore
), silver_metrics AS (
  SELECT COUNT(*) AS rows_count,
         COUNT(DISTINCT order_line_id) AS unique_lines,
         SUM(CASE WHEN product_key IS NULL THEN 1 ELSE 0 END) AS null_keys,
         SUM(CASE WHEN ship_date < order_date THEN 1 ELSE 0 END) AS invalid_ship_dates,
         SUM(CASE WHEN sales <= 0 OR quantity <= 0
                       OR discount < 0 OR discount > 1
                   THEN 1 ELSE 0 END) AS invalid_values,
         ROUND(SUM(sales),2) AS sales,
         ROUND(SUM(profit),2) AS profit
  FROM workspace.default.superstore_silver_order_lines
)
SELECT
  CASE WHEN s.rows_count = t.rows_count THEN 'PASSOU' ELSE 'FALHOU' END AS row_count,
  CASE WHEN t.unique_lines = t.rows_count THEN 'PASSOU' ELSE 'FALHOU' END AS unique_line_id,
  CASE WHEN t.null_keys = 0 THEN 'PASSOU' ELSE 'FALHOU' END AS product_key,
  CASE WHEN t.invalid_ship_dates = 0 AND t.invalid_values = 0
       THEN 'PASSOU' ELSE 'FALHOU' END AS basic_rules,
  CASE WHEN s.sales = t.sales AND s.profit = t.profit
       THEN 'PASSOU' ELSE 'FALHOU' END AS financial_reconciliation
FROM source_metrics s CROSS JOIN silver_metrics t;
