# Superstore Sales — qualidade de dados, rentabilidade e previsão

Vendas podem crescer enquanto a margem cai. Este projeto usa SQL no Databricks para preparar e validar dados do Superstore, preservar o grão dos itens e reconciliar vendas e lucro antes da visualização. Inclui análise de descontos, agregações e avaliação temporal de previsão com PySpark.

**[Abrir dashboard interativo](https://alexandresantosrodrigues.github.io/superstore-sales-dashboard/dashboard/)** · [Dashboard original no Databricks](https://dbc-487363e2-3add.cloud.databricks.com/dashboardsv3/01f1be8f35cf1b5cb74fbcc33ef34b11/published?o=7474654958318993) · [Auditoria e resultados](docs/data-quality.md)

## Perguntas de negócio

- Como acompanhar vendas e rentabilidade por período, região e categoria sem multiplicar valores em joins?
- Onde o crescimento de vendas coincide com queda de margem?
- Quais faixas de desconto concentram prejuízos?
- Uma previsão de um mês à frente supera referências simples em períodos posteriores?

## Resultados registrados

Os valores abaixo estão documentados na [auditoria](docs/data-quality.md); correspondem às execuções registradas no projeto.

| Indicador | Resultado |
|---|---:|
| Itens de pedido | 9.994 |
| Pedidos distintos | 5.009 |
| Histórico | 2014–2017, 48 meses |
| Vendas | US$ 2.297.200,86 |
| Lucro | US$ 286.397,02 |
| Agregações da gold | 573 grupos de mês × região × categoria |
| Controles do gate de qualidade | Cinco controles com resultado `PASSOU` |

Em 2017, as vendas cresceram **20,36%** frente a 2016, mas a margem caiu de **13,43% para 12,74%**. Em Furniture, a margem caiu de **3,50% para 1,40%**.

No recorte de Office Supplies com desconto acima de 30% em 2017, Binders concentra **85,70% do prejuízo**. Esses resultados ajudam a priorizar investigação de preços, custos e mix; não demonstram efeito causal do desconto.

## Fonte, granularidade e limites

Fonte: [Superstore Sales — Kaggle](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final), com 9.994 linhas de itens de pedido e 21 campos. O grão da entrada é **um item de pedido identificado por Row ID**, não um pedido completo nem um produto.

O processamento parte da tabela previamente importada `workspace.default.sample_superstore`. Os metadados registram upload pela interface do Databricks, mas o arquivo original, sua versão, hash e opções de ingestão ainda precisam ser recuperados. O projeto não demonstra coleta direta de um sistema operacional nem limpeza de um extrato operacional bruto.

## Arquitetura implementada

| Etapa | Responsabilidade | Arquivo principal |
|---|---|---|
| Entrada | Tabela Superstore previamente importada | `workspace.default.sample_superstore` |
| Silver | Tipos, nomes, chave composta e sinalizadores | [01_silver.sql](sql/01_silver.sql) |
| Gate de qualidade | Verificações antes da atualização da gold | [02_quality_gate.sql](sql/02_quality_gate.sql) |
| Gold | Métricas aditivas por mês, região e categoria | [03_gold_month_region_category.sql](sql/03_gold_month_region_category.sql) |
| Análise de descontos | Faixas de desconto e concentração das perdas | [04_discount_eda.sql](sql/04_discount_eda.sql) |
| Características | Defasagens e média dos meses anteriores | [05_monthly_features.sql](sql/05_monthly_features.sql) |
| Avaliação temporal | Baselines, validação de 2016 e teste de 2017 | [SQL de baselines](sql/06_baselines_validation_2016.sql) e [modeling/](modeling/) |
| Visualização | Exportação agregada e dashboard HTML/CSS/JS | [export/](export/) e [dashboard/](dashboard/) |

A landing/bronze do arquivo original ainda não está implementada. O gate foi executado manualmente; a interrupção automática da atualização depende de uma futura orquestração.

## Decisões de qualidade e modelagem

- **Chave de produto:** 32 Product IDs têm nomes diferentes, afetando 337 linhas. A silver deriva a chave do par ID + nome, preservando as linhas; Product ID isolado não é tratado como chave única de dimensão.
- **Codificação:** 278 linhas têm o caractere de substituição `�` nos nomes. O problema é sinalizado, sem reconstrução de texto por suposição.
- **CEP:** a importação interpretou Postal Code como número. Zeros iniciais inferidos são marcados; a conferência com o CSV original continua pendente.
- **Margem:** calculada como soma do lucro dividida pela soma das vendas, inclusive após filtros. Margens de grupos não são somadas.
- **Reconciliação:** os 573 grupos da gold representam as 9.994 linhas e reconciliam vendas e lucro com a origem.

Veja regras, contagens e limitações em [docs/data-quality.md](docs/data-quality.md).

## Previsão: validação e teste separados

O objetivo experimental é prever **vendas do próximo mês por região × categoria**.

1. Treino em 2015 e validação em 2016: comparação de baselines, Ridge, Random Forest e Gradient Boosted Trees.
2. Seleção de Ridge e do baseline de referência por categoria a partir de 2016.
3. Reajuste do modelo com 2015–2016 e avaliação final em 2017.

As previsões são de **um mês à frente**, usando apenas meses anteriores já observados. Não se trata de prever os doze meses de 2017 de uma só vez. Durante o teste, as defasagens usam os meses anteriores de 2017, mas o modelo não é reentreinado.

### Teste final de 2017

| Categoria | WAPE Ridge | WAPE baseline escolhido em 2016 |
|---|---:|---:|
| Furniture | 41,32% | 44,22% |
| Office Supplies | 40,86% | 53,26% |
| Technology | 55,79% | 76,08% |

Ridge apresentou menor erro nas três categorias, mas subestimou as vendas: o viés agregado foi **−US$ 183.648,46**. O histórico curto e os erros nos picos de vendas limitam o uso operacional. O ganho frente ao baseline não torna a previsão pronta para decisão sem monitoramento.

Scripts: [validate_2016.py](modeling/validate_2016.py) e [test_2017.py](modeling/test_2017.py). Os resultados completos estão na [auditoria](docs/data-quality.md).

## Como reproduzir no Databricks

### Preparação e análise

1. Disponibilize a mesma base em `workspace.default.sample_superstore`. Se usar outro nome, ajuste as referências dos scripts.
2. Execute [sql/01_silver.sql](sql/01_silver.sql).
3. Execute [sql/02_quality_gate.sql](sql/02_quality_gate.sql). Os cinco controles devem retornar `PASSOU`; em caso de falha, interrompa a atualização e investigue.
4. Execute [sql/03_gold_month_region_category.sql](sql/03_gold_month_region_category.sql).
5. Confira 573 grupos, 48 meses, 9.994 linhas representadas, US$ 2.297.200,86 em vendas e US$ 286.397,02 em lucro.
6. Execute [sql/04_discount_eda.sql](sql/04_discount_eda.sql) para explorar descontos e perdas.

### Avaliação de previsão

1. Execute [sql/05_monthly_features.sql](sql/05_monthly_features.sql).
2. Execute [sql/06_baselines_validation_2016.sql](sql/06_baselines_validation_2016.sql).
3. Execute [modeling/validate_2016.py](modeling/validate_2016.py) em uma célula Python.
4. Execute [modeling/test_2017.py](modeling/test_2017.py) para reproduzir o teste final já documentado.

Em um notebook com linguagem padrão SQL, use `%python` na primeira linha da célula que recebe código Python, ou altere o idioma da célula. Os scripts utilizam Spark/PySpark no ambiente Databricks.

2017 já foi usado no teste final publicado. Ajustar o modelo após consultar esses resultados exige uma nova avaliação independente; não transforma 2017 novamente em teste intocado.

## Dashboard e contrato de dados

O [dashboard](https://alexandresantosrodrigues.github.io/superstore-sales-dashboard/dashboard/) usa o arquivo [superstore-month-region-category.json](dashboard/data/superstore-month-region-category.json), exportado da gold.

- Contém 573 agregações, sem clientes ou itens individuais.
- Valida esquema, unicidade, contagem de linhas e totais financeiros antes de renderizar.
- Representa vendas e lucro como inteiros em unidades de US$ 0,0001.
- Recalcula as margens a partir dos totais filtrados.

SHA-256 do payload canônico documentado:

```text
56e35ffaad2e6cd78a52f88d884579c0dead727ab809a82ed50f050c685b5576
```

Para reproduzir a exportação, consulte [export/dashboard_payload.py](export/dashboard_payload.py) e [as instruções para Databricks](export/COPIAR_NO_DATABRICKS.txt). Para abrir o dashboard localmente, sirva a pasta por HTTP; abrir o HTML por `file://` pode impedir o carregamento do JSON.

## Arquivos do projeto

| Local | Conteúdo |
|---|---|
| [FATURAMENTO.ipynb](FATURAMENTO.ipynb) | Notebook original |
| [superstore_pipeline_analysis.ipynb](superstore_pipeline_analysis.ipynb) | Notebook de análise do pipeline |
| [sql/](sql/) | Preparação, qualidade, agregação, EDA e baselines |
| [modeling/](modeling/) | Validação de 2016 e teste final de 2017 |
| [docs/data-quality.md](docs/data-quality.md) | Evidências, decisões e resultados |
| [export/](export/) | Código e instruções de exportação |
| [dashboard/](dashboard/) | HTML, CSS, JavaScript e dados agregados |
| [index.html](index.html) | Encaminhamento para o dashboard |

## Limitações e melhorias futuras

- Recuperar a procedência e a codificação do CSV original e documentar a ingestão.
- Implementar landing/bronze com metadados do arquivo.
- Automatizar o gate de qualidade e a atualização do JSON.
- Investigar os maiores erros e o viés da previsão sem reutilizar o teste de 2017 para seleção.
- Validar hipóteses sobre desconto, custo e mix antes de recomendar uma política comercial.

**Stack:** Databricks · SQL · Python/PySpark · HTML · CSS · JavaScript · GitHub Pages.
