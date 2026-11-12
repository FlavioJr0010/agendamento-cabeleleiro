-- Executado apenas na primeira criação do volume do banco.
-- btree_gist: necessário para as exclusion constraints que impedem
-- agendamentos sobrepostos (mesma profissional ou mesma cliente).
create extension if not exists btree_gist;
-- pgcrypto: gen_random_uuid() e utilitários de hash.
create extension if not exists pgcrypto;
