-- EDA de descontos. Descrição observacional, sem inferência causal.
-- As faixas são exaustivas para descontos validados em [0, 1].
WITH classified AS (
  SELECT YEAR(order_date) AS year,
         category, subcategory, order_line_id, sales, profit, discount,
         CASE WHEN discount = 0 THEN '00 | Sem desconto'
              WHEN discount <= 0.10 THEN '01 | Até 10%'
              WHEN discount <= 0.20 THEN '02 | Mais de 10% até 20%'
              WHEN discount <= 0.30 THEN '03 | Mais de 20% até 30%'
              ELSE '04 | Mais de 30%' END AS discount_band
  FROM workspace.default.superstore_silver_order_lines
)
SELECT year, category, discount_band,
       COUNT(*) AS order_lines,
       ROUND(SUM(sales),2) AS sales,
       ROUND(SUM(profit),2) AS profit,
       ROUND(100 * SUM(profit) / NULLIF(SUM(sales),0),2) AS margin_pct
FROM classified
GROUP BY year, category, discount_band
ORDER BY year, category, discount_band;

-- Concentração das perdas na faixa extrema de Office Supplies em 2017.
WITH losses AS (
  SELECT subcategory, profit,
         ROW_NUMBER() OVER (ORDER BY profit ASC, order_line_id) AS rank_loss
  FROM workspace.default.superstore_silver_order_lines
  WHERE YEAR(order_date) = 2017
    AND category = 'Office Supplies'
    AND discount > 0.30
    AND profit < 0
)
SELECT COUNT(*) AS loss_lines,
       ROUND(SUM(profit),2) AS gross_loss,
       ROUND(SUM(CASE WHEN rank_loss <= 5 THEN profit ELSE 0 END),2) AS worst_5_loss,
       ROUND(SUM(CASE WHEN rank_loss <= 20 THEN profit ELSE 0 END),2) AS worst_20_loss,
       ROUND(SUM(CASE WHEN subcategory = 'Binders' THEN profit ELSE 0 END),2) AS binders_loss,
       ROUND(SUM(CASE WHEN subcategory = 'Appliances' THEN profit ELSE 0 END),2) AS appliances_loss
FROM losses;
