# ERP Ferkautoparts

Sistema ERP de controle de estoque para distribuidora de autopeças, desenvolvido no **PIM IV** (Análise e Desenvolvimento de Sistemas – UNIP).

**Sistema no ar:** https://erp-ferkautoparts.onrender.com

> O serviço roda no plano gratuito do Render e hiberna após 15 minutos sem acesso. O primeiro acesso pode levar cerca de 1 minuto.

## Sobre o projeto

O projeto evolui o ERP criado no PIM III, que era formado só por páginas HTML com dados fixos no código. Agora o sistema tem banco de dados real, API REST segura, publicação em nuvem e integração contínua.

## Funcionalidades

- Login com autenticação JWT
- Dashboard com indicadores de estoque
- Cadastro e consulta de produtos
- Movimentação de estoque (entradas e saídas) gravada no banco de dados
- Visão de estoque
- Área administrativa
- Acessibilidade: ajuste de tamanho de fonte (A-/A/A+), alto contraste e VLibras

## Arquitetura

Navegador (HTML/CSS/JS)      --> API .NET (JWT) --> PostgreSQL (Supabase)
Aplicativo Android (Kotlin)  --^

A API segue uma arquitetura em camadas:

| Camada | Responsabilidade |
|---|---|
| Controllers | Recebem as requisições HTTP |
| Services | Regras de negócio |
| Repositories | Acesso ao banco de dados |
| Middleware | Tratamento centralizado de erros |

## Tecnologias

| Área | Tecnologia |
|---|---|
| Backend | C# com ASP.NET Core (.NET 9) |
| Acesso a dados | Dapper e Npgsql |
| Banco de dados | PostgreSQL no Supabase |
| Segurança | JSON Web Token (JWT) |
| Documentação da API | Swagger |
| Front-end | HTML, CSS e JavaScript |
| Contêiner | Docker |
| Nuvem | Render (aplicação) e Supabase (banco) |
| CI/CD | GitHub Actions e deploy automático no Render |
| Mobile | Kotlin (Android Studio) – em desenvolvimento |

## Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| `api/` | API em C#, front-end (`wwwroot`) e Dockerfile |
| `database/` | Scripts SQL do banco de dados |
| `.github/workflows/` | Pipeline de integração contínua (`ci.yml`) |

## Como rodar localmente

Requisitos: .NET 9 SDK e um banco PostgreSQL (por exemplo, um projeto no Supabase).

Defina as variáveis de ambiente antes de iniciar:

| Variável | Descrição |
|---|---|
| `DB_CONNECTION` | String de conexão do PostgreSQL |
| `JWT_KEY` | Chave do JWT, com no mínimo 32 caracteres |

Depois execute:

cd api
dotnet run

Endereços úteis:

- `/swagger` – documentação interativa da API
- `/health` – verificação de disponibilidade

**Importante:** as credenciais nunca ficam no código. Elas são lidas de variáveis de ambiente (no Render, na aba Environment).

## DevOps

- **Versionamento:** Git e GitHub, com branches `feature/*`, Pull Request e merge na `main`
- **CI:** a cada push ou Pull Request para a `main`, o GitHub Actions restaura as dependências, compila a API e valida a imagem Docker
- **CD:** o Render publica automaticamente depois que os checks do CI passam
- **Contêiner:** Dockerfile em `api/Dockerfile`

## Metodologia

Desenvolvimento ágil com Scrum e quadro Kanban no GitHub Projects.

## Autor

Felipe Banciella – projeto acadêmico PIM IV, UNIP.
