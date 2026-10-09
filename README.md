# 💕 Love Finder

> Application de rencontre full-stack : API REST **Spring Boot 4** + interface **React 18**, avec application **Android** (Capacitor + native Kotlin/Compose).

![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ready-336791)
![Android](https://img.shields.io/badge/Android-Capacitor%20%2B%20natif-3DDC84)

Love Finder permet aux utilisateurs de créer un profil, de découvrir des recommandations, de liker / passer des profils, de matcher mutuellement et de discuter en messagerie privée — sur le web comme sur Android.

---

## ✨ Fonctionnalités

| Domaine | Ce qu'elle fait |
|---------|-----------------|
| **Auth** | Inscription, vérification d'email par code, connexion en 2 étapes (code), mot de passe oublié / réinitialisation, changement de mot de passe |
| **Profil** | Création et modification du profil, recherche d'utilisateurs |
| **Matching** | Recommandations, like / pass, matchs mutuels, invitations reçues (accepter / refuser) |
| **Chat** | Messagerie privée par match : envoyer, modifier, supprimer des messages |
| **Mobile** | Application Android via Capacitor (WebView) + application native Kotlin/Compose, navigation tactile (swipe-back), mode sombre |

Autres points :
- Authentification **JWT** (jjwt 0.12, filtre `JwtAuthFilter`, `SecurityConfig`)
- Vérification par **code email** (Spring Mail : Gmail ou Brevo, configurable par variables d'environnement)
- Endpoint `debug-code` pour lire les codes sans email **en dev uniquement** (`APP_DEBUG_CODES=false` en prod)
- Gestion centralisée des erreurs (`ApiExceptionHandler`)
- Validation des requêtes (`spring-boot-starter-validation`)

---

## 🧱 Stack technique

**Backend**
- Java 17, Spring Boot 4.1.1 (WebMVC, Data JPA, Validation, Security, Mail)
- JWT avec [jjwt](https://github.com/jwtk/jjwt) 0.12.6
- PostgreSQL (pilote `postgresql`, `ddl-auto=update`)
- Maven (wrapper `mvnw` inclus)

**Frontend**
- React 18, Vite 5, React Router v6
- Axios (intercepteur `Bearer` automatique)
- Capacitor 8 (Android)

**Android natif**
- Kotlin, Jetpack Compose, Gradle 8 (`com.android.application` 8.13.0)

### Architecture backend

```
Controller (REST)  →  Service  →  Repository (JPA)  →  Entity
        ↑                                             
   DTO (dto/)              ApiExceptionHandler     Security (JwtService, JwtAuthFilter, SecurityConfig)
```

```
love-finder-dating-app/
├── datingbackend/                  # API Spring Boot (port 8081)
│   ├── src/main/java/com/dating/datingbackend/
│   │   ├── controller/   # Auth, User, Match, Message + ApiExceptionHandler
│   │   ├── service/      # Logique métier
│   │   ├── repository/   # Accès aux données (JPA)
│   │   ├── model/        # Entités (User, Like, Message)
│   │   ├── dto/          # LoginRequest, RegisterRequest, VerifyRequest, UserDto
│   │   └── security/     # JwtService, JwtAuthFilter, SecurityConfig
│   ├── src/main/resources/application.properties
│   └── pom.xml
├── frontend/                       # Application React (port 3000)
│   ├── src/pages/        # Browse, Chat, Login, Register, Profile, Matches, Settings, ...
│   ├── src/components/   # BottomNav, SearchBar, ThemeToggle
│   ├── src/contexts/     # ThemeContext
│   ├── src/services/api.js
│   ├── capacitor.config.json
│   └── android/          # Projet Android généré par Capacitor
└── android-native/                 # Application Android 100 % native (Kotlin/Compose)
```

---

## 🚀 Démarrage rapide

### Prérequis
- JDK **17**
- Maven 3.9+ (ou utilisez `./mvnw`)
- Node.js **18+** et npm
- PostgreSQL **14+** avec une base `datingdb`

### 1. Backend

```bash
cd datingbackend

# Base de données + secrets (aucun secret n'est versionné)
export DB_URL=jdbc:postgresql://localhost:5432/datingdb
export DB_USERNAME=postgres
export DB_PASSWORD=votre_mot_de_passe
export APP_JWT_SECRET=$(openssl rand -base64 32)   # min. 32 caractères

# Email (optionnel en dev : APP_DEBUG_CODES=true par défaut)
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=votre-email@gmail.com
export MAIL_PASSWORD=votre-mot-de-passe-application

./mvnw spring-boot:run
```

L'API démarre sur **http://localhost:8081**

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # puis adaptez VITE_API_URL si besoin
npm install
npm run dev
```

L'interface est disponible sur **http://localhost:3000** (proxy `/api` → `http://localhost:8081` inclus en dev).

### 3. Android (APK via Capacitor)

```bash
cd frontend
npm run apk:lan     # build web + sync vers android/ (VITE_API_URL vers votre IP LAN)
# puis ouvrez frontend/android dans Android Studio et lancez l'APK
```

### 4. Production

```bash
# Backend : PostgreSQL + secrets via variables d'environnement
export DB_URL=jdbc:postgresql://<host>:5432/datingdb
export DB_USERNAME=<user>
export DB_PASSWORD=<mot_de_passe_fort>
export APP_JWT_SECRET=$(openssl rand -base64 32)
export APP_DEBUG_CODES=false
export APP_CORS_PATTERNS=https://votre-domaine.com
./mvnw -DskipTests package

# Frontend : pointez vers le backend public puis buildez
VITE_API_URL=https://votre-backend.com/api npm run build
```

---

## 📡 API REST

Toutes les routes sont préfixées par `/api`.

| Domaine | Endpoints principaux |
|---------|----------------------|
| **Auth** | `POST /api/auth/register` · `/verify` · `/login` · `/login/verify` · `/forgot` · `/reset` · `/change-password` · `GET /check-email?email=` |
| **Users** | `GET /api/users/me` · `PUT /me` · `GET /search?q=` · `GET /{id}` |
| **Matches** | `GET /api/matches/recommendations` · `GET /` (mes matchs) · `GET /invites` · `POST /like/{userId}` · `POST /pass/{userId}` |
| **Messages** | `GET /api/messages/{matchId}` · `POST /{matchId}` · `PUT /{id}` · `DELETE /{id}` |

Exemple rapide :

```bash
# Inscription
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"lea@example.com","password":"Secret123$","name":"Léa"}'

# Recommandations (avec token JWT)
curl http://localhost:8081/api/matches/recommendations \
  -H "Authorization: Bearer <token>"
```

---

## 🖥️ Pages du frontend

`/` (redirection) · `/login` · `/register` · `/verify` · `/forgot` · `/browse` Découverte · `/matches` Matchs & invitations · `/chat/:matchId` Discussion · `/profile` Profil · `/settings` Paramètres

---

## ⚠️ Limites connues

- Pas de jeu de données de démonstration : les comptes se créent via `/register`.
- L'envoi d'email nécessite des identifiants SMTP valides (sinon utilisez `APP_DEBUG_CODES=true` en dev).
- Le matching par compatibilité (recommandations) reste basique : à enrichir (filtres, score, géolocalisation).
- La configuration CORS est permissive en dev : à restreindre en production via `APP_CORS_PATTERNS`.

## 🗺️ Pistes d'amélioration

- Téléversement de photos de profil
- Notifications push (mobile) et temps réel (WebSocket)
- Tests unitaires et d'intégration (JUnit, Testcontainers)
- Conteneurisation (Docker Compose : API + frontend + PostgreSQL)
- Documentation OpenAPI (springdoc) + collection Postman

---

## 📄 Licence

Distribué sous licence **MIT**.
