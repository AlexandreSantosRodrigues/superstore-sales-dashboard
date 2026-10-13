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

## Concentração de perdas em Office Supplies, desconto >30%, 2017

As 232 linhas do recorte tiveram prejuízo: US$ 18.437,59 de prejuízo bruto e líquido. Os cinco piores registros somam US$ 8.905,55 (48,30%); os 20 piores, US$ 14.592,77 (79,15%). Binders responde por US$ 15.800,57 (85,70%); Appliances, US$ 2.637,02. Entre os maiores registros aparecem descontos de 70% e 80%. Esses resultados priorizam auditoria de preços e custos, sem estimar um efeito causal do desconto. Consulta em `sql/04_discount_eda.sql`.

## Metadados da tabela de entrada

`DESCRIBE EXTENDED workspace.default.sample_superstore` confirma uma tabela Delta gerenciada criada em 02/10/2026 18:08:40 UTC pela interface de upload, com 9.994 linhas. O catálogo não expôs o caminho, hash nem as opções do CSV original. `Postal Code` já foi interpretado como BIGINT; converter esse valor para STRING na silver não recupera zeros à esquerda possivelmente perdidos durante a importação. Na futura ingestão do arquivo original, ler CEP como texto e comparar com a versão atual.

## CEPs com quatro dígitos após o upload

A tabela importada contém 449 linhas e 52 valores distintos de `Postal Code` com quatro dígitos, em Connecticut, Maine, Massachusetts, New Hampshire, New Jersey, Rhode Island e Vermont. Outras 9.545 linhas têm cinco dígitos. Isso é consistente com zeros iniciais descartados pela conversão numérica, mas o CSV original ainda não foi conferido. A silver mantém `postal_code_source` como texto do número importado, deriva `postal_code` com `LPAD(..., 5, '0')` apenas nos valores de quatro dígitos dos EUA e marca `postal_code_inferred_zero`. Trata-se de inferência reversível, não de valor confirmado da fonte.

## Validação temporal da previsão

Objetivo: vendas do próximo mês por região × categoria; 144 linhas de treino em 2015 e 144 de validação em 2016. As 3 combinações ausentes na origem foram preenchidas com zero observado no dataset e sinalizadas. A comparação é de um mês à frente com atualização mensal dos valores passados; não é uma previsão em lote de doze meses feita no fim de 2016.

| Categoria | Melhor baseline 2016 (WAPE) | Ridge 2016 (WAPE) | Ridge, viés USD |
| --- | ---: | ---: | ---: |
| Furniture | mês do ano anterior (53,49%) | 40,78% | -25.592,80 |
| Office Supplies | média de 3 meses (55,18%) | 39,22% | -46.103,03 |
| Technology | mês do ano anterior (66,78%) | 55,30% | -59.849,02 |

Random Forest e Gradient Boosted Trees também foram avaliados com parâmetros fixos e ficaram atrás de Ridge nas três categorias. Os vieses negativos permanecem relevantes; a capacidade de acompanhar crescimento é uma limitação. O ano de 2017 não foi consultado para seleção. O script `modeling/test_2017.py` fixa Ridge e os baselines escolhidos em 2016, reentreina com 2015–2016 e avalia 2017 uma única vez. Resultados finais ainda pendentes.

## Teste final de 2017 (sem seleção posterior)

Treino 2015–2016; 144 previsões mensais por região × categoria em 2017. O benchmark por categoria foi escolhido na validação de 2016. Previsão de um mês à frente em origem móvel; meses anteriores de 2017 já observados alimentam as defasagens, mas o modelo não é reentreinado durante o teste.

| Categoria | Ridge WAPE | Baseline WAPE | Ridge viés USD |
| --- | ---: | ---: | ---: |
| Furniture | 41,32% | 44,22% | -28.541,99 |
| Office Supplies | 40,86% | 53,26% | -81.707,40 |
| Technology | 55,79% | 76,08% | -73.399,07 |

O Ridge melhora o erro absoluto em todas as categorias, mas seu viés negativo agregado é US$ 183.648,46. Alguns dos dez maiores erros são picos de vendas em East/Technology (outubro e novembro), West/Technology (março) e Office Supplies (Central em janeiro; West em agosto). Portanto, o modelo é uma comparação experimental, não uma previsão operacional pronta para decisão sem monitoramento, calibragem e investigação dos picos. Não reajustar parâmetros após ver 2017 e continuar chamando-o de teste intocado.
