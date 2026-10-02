# 📊 Superstore Sales Dashboard — SQL on Databricks

Dashboard de vendas com KPIs executivos, análise de tendência e insights de rentabilidade,  
construído com **Spark SQL** no **Databricks Serverless**.

---

## 🔗 Dashboard 

**[Acesse o dashboard ao vivo →](https://dbc-487363e2-3add.cloud.databricks.com/dashboardsv3/01f1be8f35cf1b5cb74fbcc33ef34b11/published?o=7474654958318993)**

---

## 🎯 Objetivo

Analisar o desempenho de vendas de uma empresa de varejo B2B, identificando
oportunidades de melhoria de margem e padrões de sazonalidade.

---

## 🗂️ Dataset

- **Fonte:** [Superstore Sales — Kaggle](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final)
- **Volume:** 9.994 transações | 21 variáveis | 2014–2017
- **Categorias:** Furniture, Office Supplies, Technology

---

## 🛠️ Stack

| Ferramenta | Uso |
|---|---|
| Databricks Serverless | Execução SQL e Dashboard |
| Spark SQL | Análise e transformação |
| Databricks Lakeview | Visualizações e Dashboard |
| GitHub | Versionamento e portfólio |

---

## 📊 KPIs do Negócio

| Métrica | Valor |
|---|---|
| Faturamento Total | \$2.297.200 |
| Lucro Total | \$286.397 |
| Total de Pedidos | 5.009 |
| Ticket Médio | \$458,61 |
| Margem de Lucro | 12,47% |

---

## 💡 Principais Insights

### 1 — Technology lidera em faturamento e margem
| Categoria | Faturamento | Margem |
|---|---|---|
| Technology | \$836.154 | 17,40% 🟢 |
| Furniture | \$741.999 | 2,49% 🔴 |
| Office Supplies | \$719.047 | 17,04% 🟢 |

---

### 2 — Furniture tem subcategorias no prejuízo
| Subcategoria | Faturamento | Margem |
|---|---|---|
| Chairs | \$328.449 | 8,10% 🟡 |
| Tables | \$206.965 | **-8,56%** 🔴 |
| Bookcases | \$114.880 | **-3,02%** 🔴 |

> Tables e Bookcases geram \$321k em receita mas operam com prejuízo real.

---

### 3 — Sazonalidade clara: picos em Set/Nov/Dez
> Q4 (Out-Dez) concentra os maiores volumes — típico de varejo B2B  
> com fechamento de orçamento corporativo no fim do ano.  
> Q1 (Jan-Fev) é consistentemente o período mais fraco.

---

### 4 — West lidera com a melhor margem regional
| Região | Faturamento | Margem |
|---|---|---|
| West | \$725.457 | 14,94% 🟢 |
| East | \$678.781 | 13,48% 🟢 |
| Central | \$501.239 | **7,92%** 🔴 |
| South | \$391.721 | 11,93% 🟡 |

---

### 5 — Descontos acima de 20% destroem a margem
| Faixa de Desconto | Margem | Lucro |
|---|---|---|
| Sem desconto | 29,51% 🟢 | +\$320.987 |
| 1–10% | 16,61% 🟢 | +\$9.029 |
| 11–20% | 11,58% 🟡 | +\$91.756 |
| 21–30% | -10,05% 🔴 | -\$10.369 |
| Acima de 30% | **-48,16%** 🔴 | **-\$125.006** |

> A empresa perde \$135k em itens com desconto acima de 20%.  
> Esta é a principal causa da baixa margem em Furniture e na região Central.

---

## 🧠 Técnicas SQL Utilizadas

- **CTEs encadeadas** (`WITH`) para modularizar transformações complexas
- **Window Functions** (`LAG()`, `RANK()`, `SUM() OVER()`, `AVG() OVER()`)
- **CASE WHEN** para criação de faixas e segmentos
- **DATE_FORMAT** para agregação temporal
- **CAST** para tratamento de tipos

---

## 📁 Estrutura do Projeto

```
superstore-sales-dashboard/
│
├── superstore_sales_analysis.sql   # Queries completas
└── README.md                       # Documentação e insights
```

---
