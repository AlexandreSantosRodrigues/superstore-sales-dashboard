# Auditoria de dados e decisões

Fonte atual: `workspace.default.sample_superstore`, importação anterior do conjunto Superstore vinculado no README. Não é um extrato operacional bruto; o arquivo original, versão, hash e opções de importação ainda não foram recuperados. Não afirmar que houve coleta por API ou limpeza de dados brutos.

## Linha de base observada (12/10/2026)

| Controle | Resultado |
| --- | ---: |
| Linhas / Row IDs distintos | 9.994 / 9.994 |
| Pedidos distintos | 5.009 |
| Período | 03/01/2014–30/12/2017 |
| Vendas / lucro | US$ 2.297.200,86 / US$ 286.397,02 |
| Valores inválidos nos testes iniciais | 0 |
| Product IDs com mais de um nome | 32 |
| Linhas afetadas por esses IDs | 337 |
| Vendas / lucro dessas linhas | US$ 97.465,67 / US$ 13.230,92 |
| Linhas com caractere de substituição no nome | 278 |
| Pares Product ID + Product Name com categoria inconsistente | 0 |
| Produtos por chave composta na silver | 1.894 |
| Grupos mês × região × categoria / meses | 573 / 48 |

Os cinco controles de `sql/02_quality_gate.sql` foram executados no Databricks e retornaram PASSOU. A tabela gold representa 9.994 linhas e reconcilia vendas e lucro com a origem. Os números são evidência da execução informada; a consulta versionada permite repetir a verificação.

## Regras

- Preservar a granularidade de `Row ID`; nunca deduplicar por `Product ID`.
- `Product ID` não é único para um produto. A chave derivada usa o par ID + nome. Não tratá-la como identificador mestre universal.
- Manter o caractere `�` sinalizado, sem substituir por texto adivinhado. Investigar codificação do arquivo de origem antes de corrigir.
- Margem agregada = soma do lucro / soma das vendas. Não somar margens calculadas por grupo.
- Classificar descontos com limites contínuos: zero; (0, 0,10]; (0,10, 0,20]; (0,20, 0,30]; (0,30, 1].
- Arredondamentos por grupo podem diferir em US$ 0,01 da soma global apresentada com duas casas. Conciliar com os valores monetários de quatro casas.
- Correlação entre desconto e lucro não estabelece efeito causal; o custo e o mix de produtos podem variar.

## Achados de EDA

Vendas de 2016: US$ 609.205,60; 2017: US$ 733.215,26. Margem: 13,43% para 12,74%. Em Furniture, margem: 3,50% para 1,40%. Vendas com desconto acima de 20% em Furniture: cerca de US$ 49,0 mil para US$ 60,5 mil; perdas dessas faixas: cerca de US$ 13,5 mil para US$ 17,5 mil.

Em 2017, Office Supplies com desconto acima de 30% registrou US$ 14.619,25 de vendas e US$ 18.437,59 de prejuízo. As maiores perdas individuais observadas são de Binders e Appliances com desconto de 70% a 80%. Investigar concentração e composição antes de recomendar uma política comercial.

## Próximos controles

Recuperar o CSV original e sua proveniência; auditar codificação e tipo de CEP na ingestão; criar testes que interrompam a atualização da gold em caso de falha; medir a concentração das perdas; validar exportação estática do dashboard.
