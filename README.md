# Excalidraw Cloud Server

<div align="center">
  <img src="/public/logo.png" alt="Exc Server Logo" width="200" />
  <p><em>Your secure, personal whiteboard cloud storage.</em></p>
</div>

A self-hosted, cloud-enabled backend for Excalidraw, built with Next.js, Prisma, and Tailwind CSS.

## 💡 Motivation

I've always loved using [Excalidraw](https://excalidraw.com/) for its simplicity and hand-drawn aesthetic. However, I often found myself in a dilemma: efficient cloud synchronization requires a paid subscription (Excalidraw+), while saving files locally feels cumbersome and makes switching devices difficult.

**Exc Server** was born to solve this. It provides a seamless, self-hosted solution to manage your drawings in the cloud (using S3-compatible storage or your own server) without the recurring costs.

## ✨ Features

- **Cloud Storage**: Store your files safely in the cloud (AWS S3, Aliyun OSS, MinIO) or locally.
- **File Management**: Organize your drawings with folders, rename, delete, and drag-and-drop support.
- **Modern UI**: A polished, responsive interface built with Tailwind CSS and Framer Motion.
- **Authentication**: Secure user accounts via NextAuth.js.
- **Postgres Database**: Robust metadata management using Prisma and PostgreSQL.

## 🚀 Deployment

### Option 1: Docker (Recommended)

The easiest way to get started is using Docker Compose. This bundles the application, PostgreSQL database, and Caddy reverse proxy.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yiheng-Liu/exc-server.git
   cd exc-server
   ```

2. **Configure Environment:**
   Open `docker-compose.yml` and configure your environment variables (Database URL is pre-configured for the internal DB).
   
   If you want to use S3 storage:
   ```yaml
   - STORAGE_PROVIDER=s3
   - AWS_ACCESS_KEY_ID=your_key
   - AWS_SECRET_ACCESS_KEY=your_secret
   - AWS_S3_REGION=us-east-1
   - AWS_S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com # Optional for standard AWS
   - AWS_S3_BUCKET=your_bucket
   ```

3. **Run Services:**
   ```bash
   docker-compose up -d
   ```
   **Access:** Open [http://localhost](http://localhost) in your browser.
   
   > **Note:** The application uses **Caddy** as a reverse proxy (defined in `docker-compose.yml`). The access port and proxy rules are configured in the `Caddyfile`. By default, it listens on port `80`.

### Option 2: Local Development

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup Database:**
   Ensure you have a PostgreSQL database running.
   ```bash
   # Copy example env
   cp .env_example .env
   # Update .env with your DATABASE_URL
   
   # Push schema to DB
   npx prisma db push
   ```

3. **Run Development Server:**
   ```bash
   pnpm dev
   ```
   Access the app at `http://localhost:3000`.

### Option 3: Vercel (Cloud)

1. **Push to GitHub**: Ensure your latest code is on GitHub.
2. **Import Project**: In Vercel, import your repository.
3. **Configure Environment Variables**: Add your database and S3 secrets:
   - `DATABASE_URL` (Connection string to your online Postgres, e.g., Neon/Supabase)
   - `STORAGE_PROVIDER=s3`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_REGION` / `AWS_S3_BUCKET` / `AWS_S3_ENDPOINT`
   - `NEXTAUTH_SECRET` (Generate a random string)
   - `NEXTAUTH_URL` (Your Vercel domain, e.g., `https://your-app.vercel.app`)

4. **Build & Deploy**: Vercel will automatically run `npm install` (which triggers `prisma generate`) and then builds.
5. **Database Migration**:
   - Vercel does **not** automatically run migrations on deployment by default.
   - **Option A (Recommended)**: Connect to your production DB locally and run:
     ```bash
     # Update .env to point to PROD database
     npx prisma migrate deploy
     ```
   - **Option B (Build Command)**: In Vercel Project Settings > Build & Development Settings, change the Build Command to:
     ```bash
     npx prisma migrate deploy && next build
     ```

## 🗺️ Roadmap & Todo

- [ ] **Team Collaboration**: Real-time collaboration (WebSocket/P2P) for teams.
- [ ] **Sharing**: Public links for read-only access to drawings.
- [ ] **Versioning**: History and version control for files.
- [ ] **Bug Fixes**: Continuous improvement and stability enhancements.
- [ ] **Plugins**: Support for custom Excalidraw scripts/plugins.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT
