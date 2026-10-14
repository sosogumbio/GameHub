# Banco de dados PostgreSQL

O GameHub usa PostgreSQL. Crie um banco chamado `gamehub` no pgAdmin e configure `DATABASE_URL` no arquivo `back/.env`.

O comando `npm run init-db` cria as tabelas e índices, cadastra os usuários de demonstração e preenche o catálogo até 60.000 produtos. A inicialização pode ser repetida sem inserir novamente os dados de demonstração. O índice trigram usa a extensão PostgreSQL `pg_trgm`, habilitada pelo esquema para acelerar buscas parciais por nome e descrição.

Não execute o arquivo SQL no pgAdmin se já for usar o script de inicialização; ele é mantido como referência do esquema.

Os favoritos são armazenados localmente no navegador e o filtro consulta somente os IDs salvos, sem transferir o catálogo inteiro.
