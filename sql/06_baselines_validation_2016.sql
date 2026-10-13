-- Validação de baselines: 2016 apenas. NÃO usar 2017 para escolher modelo.
-- Previsão um mês à frente, em origem móvel: meses anteriores observados
-- estão disponíveis na data de cada previsão.
WITH source AS (
  SELECT sales_month, region, category, CAST(sales AS DOUBLE) AS actual,
         CAST(sales_lag_1 AS DOUBLE) AS lag_1,
         CAST(sales_lag_12 AS DOUBLE) AS lag_12,
         CAST(sales_trailing_3 AS DOUBLE) AS trailing_3
  FROM workspace.default.superstore_features_month_region_category
  WHERE YEAR(sales_month) = 2016
), predictions AS (
  SELECT 'ultimo_mes' AS baseline, category, actual, lag_1 AS predicted FROM source
  UNION ALL
  SELECT 'mes_ano_anterior', category, actual, lag_12 FROM source
  UNION ALL
  SELECT 'media_3_meses', category, actual, trailing_3 FROM source
)
SELECT baseline, category, COUNT(*) AS observations,
       ROUND(AVG(ABS(actual - predicted)),2) AS mae_usd,
       ROUND(100 * SUM(ABS(actual - predicted))
             / NULLIF(SUM(actual),0),2) AS wape_pct,
       ROUND(SUM(predicted - actual),2) AS signed_bias_usd
FROM predictions
WHERE predicted IS NOT NULL
GROUP BY baseline, category
ORDER BY category, wape_pct;
