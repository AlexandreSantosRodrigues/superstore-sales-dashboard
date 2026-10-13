-- Métricas aditivas. Margem deve ser SUM(profit)/SUM(sales) após filtros.
-- Pedidos distintos não são aditivos entre grupos e por isso não entram aqui.
CREATE OR REPLACE TABLE workspace.default.superstore_gold_month_region_category
USING DELTA AS
SELECT DATE_TRUNC('MONTH', order_date) AS sales_month,
       region, category,
       COUNT(*) AS order_lines,
       SUM(quantity) AS units,
       ROUND(SUM(sales),4) AS sales,
       ROUND(SUM(profit),4) AS profit
FROM workspace.default.superstore_silver_order_lines
GROUP BY DATE_TRUNC('MONTH', order_date), region, category;

SELECT COUNT(*) AS groups_count,
       COUNT(DISTINCT sales_month) AS months_count,
       SUM(order_lines) AS represented_lines,
       ROUND(SUM(sales),2) AS sales,
       ROUND(SUM(profit),2) AS profit
FROM workspace.default.superstore_gold_month_region_category;
