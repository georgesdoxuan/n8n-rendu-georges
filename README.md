# Rendu n8n — Georges Doxuan

Deux projets de workflows n8n, indépendants, chacun avec ses sources, sa
documentation et ses exports.

## Structure du repo

```
projets/
├── ecommerce-telegram/      Projet 1 : workflow génératif
│   ├── README.md            description complète + ce que le projet démontre
│   ├── prompts/             4 versions du prompt system image (DeepSeek/Vertice)
│   ├── docs/                spec technique + revue hostile
│   └── specs/               spec métier validée
│
├── rag-ecom-chatbot/        Projet 2 : chatbot RAG (upload PDF -> chat cité)
│   ├── README.md            installation 15 min + utilisation
│   ├── exports/             les 2 workflows importables (JSON)
│   └── setup.sql            SQL Supabase à exécuter une fois
│
└── casino-stake/            Projet secondaire : idées jeux casino
    └── specs/               mécaniques de jeu

n8n/
└── workflows/               Sources TypeScript de TOUS les workflows
                           (format @n8n/workflow-sdk, synchronisées avec
                           l'instance n8n via n8ncli — ce dossier est imposé
                           par l'outil, d'ou les workflows ne sont pas dans
                           leurs dossiers de projet)
```

## Les deux projets en une phrase

1. **`projets/ecommerce-telegram/`** : chaque matin, une idée de boutique
   e-commerce jamais répétée, deux mockups mobiles générés par IA, livrés sur
   Telegram — démontre le workflow-as-code, le prompt engineering itératif, la
   gestion des credentials sans clé en clair, l'anti-doublon par data table.
2. **`projets/rag-ecom-chatbot/`** : déposer un PDF dans un formulaire, le
   chatbot répond uniquement depuis ce document avec citations et mémoire
   persistante (Supabase pgvector, recherche hybride, reranking LLM) —
   remise de cours autonome (exports + SQL + README d'installation).

Pour le détail de chaque projet, voir le README de son dossier.
