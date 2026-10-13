-- Série mensal completa para previsão de vendas por região × categoria.
-- Ausência na gold = nenhuma linha de pedido observada nessa combinação/mês
-- dentro da fonte importada; não prova ausência de vendas no mundo real.
-- Avaliação planejada: previsão de um mês à frente, atualizada mensalmente.
CREATE OR REPLACE TABLE workspace.default.superstore_features_month_region_category
USING DELTA AS
WITH months AS (
  SELECT EXPLODE(SEQUENCE(DATE '2014-01-01', DATE '2017-12-01',
                          INTERVAL 1 MONTH)) AS sales_month
), regions AS (
  SELECT DISTINCT region FROM workspace.default.superstore_silver_order_lines
), categories AS (
  SELECT DISTINCT category FROM workspace.default.superstore_silver_order_lines
), dense AS (
  SELECT m.sales_month, r.region, c.category,
         CASE WHEN g.sales_month IS NULL THEN FALSE ELSE TRUE END AS observed_in_source,
         COALESCE(g.sales, CAST(0 AS DECIMAL(18,4))) AS sales,
         COALESCE(g.profit, CAST(0 AS DECIMAL(18,4))) AS profit,
         COALESCE(g.order_lines, 0) AS order_lines
  FROM months m CROSS JOIN regions r CROSS JOIN categories c
  LEFT JOIN workspace.default.superstore_gold_month_region_category g
    ON CAST(g.sales_month AS DATE) = m.sales_month
   AND g.region = r.region
   AND g.category = c.category
)
SELECT sales_month, region, category, observed_in_source,
       sales, profit, order_lines,
       MONTH(sales_month) AS calendar_month,
       LAG(sales, 1) OVER w AS sales_lag_1,
       LAG(sales, 12) OVER w AS sales_lag_12,
       AVG(sales) OVER (
         PARTITION BY region, category ORDER BY sales_month
         ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
       ) AS sales_trailing_3
FROM dense
WINDOW w AS (PARTITION BY region, category ORDER BY sales_month);

-- Deve retornar 576 linhas, 3 ausentes, 432 com lag sazonal,
-- e os totais de vendas/lucro conciliados.
SELECT COUNT(*) AS rows_count,
       SUM(CASE WHEN NOT observed_in_source THEN 1 ELSE 0 END) AS zero_filled_groups,
       SUM(CASE WHEN sales_lag_12 IS NOT NULL THEN 1 ELSE 0 END) AS seasonal_lag_rows,
       ROUND(SUM(sales),2) AS sales,
       ROUND(SUM(profit),2) AS profit
FROM workspace.default.superstore_features_month_region_category;
