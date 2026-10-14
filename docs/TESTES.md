# Testes e validação de desempenho

## Testes de regressão automatizados

Execute a partir da raiz do repositório:

```powershell
.\back\node_modules\.bin\tsx.cmd --test back\tests\ProductRepository.test.ts
```

Os testes cobrem o filtro pela coluna `category` e a ordenação numérica crescente por preço. Antes das correções, ambos falhavam: a categoria era aplicada sobre `name` e os preços eram comparados como texto (`100`, `20`, `9.9`).

## Validação manual no navegador

Use o mesmo navegador, computador e banco antes/depois das alterações. Registre apenas medições realmente observadas; a duração depende do ambiente.

1. Faça login e abra DevTools > Network. Na carga inicial, confira que `/products` devolve até 24 itens, junto com o total, e que `/products/categories` lista as categorias disponíveis.
2. Digite um termo lentamente e depois cole outro. A busca é enviada após 300 ms sem digitação; confirme que não há uma requisição por tecla.
3. Pesquise um termo que exista em nome e outro que exista apenas na descrição. Confirme o filtro por categoria e a ordenação por nome e preço.
4. Confira no DOM que há no máximo 24 cartões por página. Use Anterior/Próxima e confirme que filtros e ordenação mantêm a paginação correta.
5. Marque produtos como favoritos, atualize a página e confirme que as marcações persistem. Selecione “Favoritos” e navegue pelos resultados; retire um produto da lista e confirme a atualização. Os favoritos são locais ao navegador.
6. No terminal do backend, confirme uma única consulta paginada por atualização do catálogo e uma consulta agregada para os quatro indicadores do dashboard.
7. Como administrador, cadastre e exclua um produto. Confirme que a atualização solicita/renderiza apenas a página atual, não os 60.000 produtos.
8. Confira o dashboard com os indicadores de produtos, estoque baixo, categorias e valor em estoque.
9. Repita a medição no DevTools > Performance e compare scripting/renderização e bytes transferidos. Anote seus valores localmente; não use tempos fabricados.

## Banco de dados

Execute `npm run init-db` na raiz contra o banco configurado em `back/.env`. Confirme que a contagem é de 60.000 produtos e execute o comando novamente para verificar que a inicialização não acrescenta dados de demonstração duplicados. Verifique os índices `idx_products_category`, `idx_products_name_trgm`, `idx_products_description_trgm` e `idx_products_price` após cada inicialização.
