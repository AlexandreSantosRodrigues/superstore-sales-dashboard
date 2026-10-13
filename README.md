# Superstore Sales | engenharia de dados no Databricks

Projeto em evolução: do notebook exploratório para um pipeline SQL com contratos de qualidade, camada tratada e agregações para análise. O dashboard original continua disponível no [Databricks](https://dbc-487363e2-3add.cloud.databricks.com/dashboardsv3/01f1be8f35cf1b5cb74fbcc33ef34b11/published?o=7474654958318993). Um dashboard em HTML, CSS e JavaScript será construído após a exportação validada dos dados.

## Pergunta de negócio

Como acompanhar vendas e rentabilidade por período, região e categoria sem mascarar problemas de qualidade ou multiplicar valores em joins?

## Fonte e limites

[Superstore Sales — Kaggle](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final), 9.994 linhas de itens de pedido, 21 campos, 2014–2017. A fonte atual no Databricks é `workspace.default.sample_superstore`, já importada. **Não há evidência de coleta direta de um sistema operacional nem de dados brutos originalmente sujos.** O arquivo, sua versão, hash e opções de ingestão ainda precisam ser documentados. Os nomes de produtos com `�` não serão reconstruídos por suposição.

## Arquitetura atual

```text
sample_superstore (tabela previamente importada)
    → silver_order_lines (tipos, nomes, chave de produto, sinalizadores)
    → gold_month_region_category (métricas aditivas)
    → exportação JSON validada (planejada)
    → dashboard HTML/CSS/JS (planejado)
```

A camada de landing/bronze do arquivo original e o dashboard web **ainda não foram implementados**. A preparação de características e os scripts de validação preditiva foram adicionados, mas os modelos ainda não foram executados nem avaliados no teste final.

## Como reproduzir no Databricks Free Edition

1. Disponibilize o mesmo Superstore em `workspace.default.sample_superstore`. Se usar outra tabela, altere a referência nos arquivos SQL.
2. Execute [`sql/01_silver.sql`](sql/01_silver.sql).
3. Execute [`sql/02_quality_gate.sql`](sql/02_quality_gate.sql); todos os cinco campos devem retornar `PASSOU`. Se algum falhar, interrompa a atualização da gold e investigue.
4. Execute [`sql/03_gold_month_region_category.sql`](sql/03_gold_month_region_category.sql) e confira 48 meses, 9.994 linhas representadas, US$ 2.297.200,86 em vendas e US$ 286.397,02 em lucro.

Os scripts são Databricks SQL; não exigem instalação local. O gate foi executado manualmente; orquestração automática ainda é trabalho futuro.

## Evidências e decisões

A auditoria encontrou 32 `Product ID` com nomes de produtos diferentes (337 linhas; US$ 97.465,67 em vendas). Por isso, `Product ID` sozinho não é chave de dimensão. A silver deriva uma chave do par ID + nome e preserva todas as linhas. Há 278 linhas com caractere de substituição nos nomes, registradas sem correção arbitrária. A gold tem 573 grupos de mês × região × categoria e reconcilia os valores com a origem. Veja [auditoria e limitações](docs/data-quality.md).

Em 2017 as vendas cresceram 20,36% frente a 2016, mas a margem caiu de 13,43% para 12,74%. Em Furniture ela caiu de 3,50% para 1,40%. Faixas de desconto mais altas coincidem com prejuízos maiores; **não há inferência causal** a partir dessa associação.

## Próximas entregas

- Rastrear a origem do CSV e a codificação; implementar landing/bronze com metadados de ingestão.
- Automatizar o gate de qualidade e exportar dados agregados com checagem de totais.
- Publicar o dashboard estático em HTML/CSS/JS.
- Avaliar previsão com baseline sazonal, validação temporal e análise de erros. Com apenas 48 meses, evitar prometer ganho de ML antes de medir.
- Documentar o resultado final e redigir o post técnico de LinkedIn.

## Estrutura

```text
FATURAMENTO.ipynb
sql/01_silver.sql
sql/02_quality_gate.sql
sql/03_gold_month_region_category.sql
docs/data-quality.md
README.md
```
