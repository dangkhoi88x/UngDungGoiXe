# Deploy Rent Car Platform

Tai lieu nay ghi lai cac buoc da lam de deploy project len production/demo:

- Frontend: AWS Amplify
- Backend: EC2 Ubuntu + Docker Compose
- Database: MySQL container tren EC2, luu bang Docker volume
- Redis: Redis container tren EC2
- HTTPS backend: Nginx reverse proxy + Certbot Let's Encrypt
- Domain: `thuexeoto.online`
- API domain: `api.thuexeoto.online`

## 1. Kien truc sau khi deploy

```text
User browser
  -> https://www.thuexeoto.online
  -> AWS Amplify / CloudFront / S3 static frontend

Frontend API calls
  -> https://api.thuexeoto.online
  -> EC2 Nginx HTTPS :443
  -> proxy_pass http://127.0.0.1:8080
  -> Spring Boot backend Docker container
  -> MySQL + Redis Docker containers
```

Domain hien tai:

```text
Frontend: https://www.thuexeoto.online
Root:     https://thuexeoto.online
Backend:  https://api.thuexeoto.online
Swagger:  https://api.thuexeoto.online/swagger-ui/index.html
```

Elastic IP hien tai cua EC2:

```text
13.228.161.189
```

## 2. Build frontend tren AWS Amplify

Project frontend nam trong thu muc:

```text
frontend/
```

Trong Amplify, khi connect GitHub repo va branch, cau hinh build:

```text
Frontend build command:
cd frontend && npm ci && npm run build

Build output directory:
frontend/dist
```

Neu Amplify co muc "App root" / "Monorepo root", co the dung:

```text
App root: frontend
Frontend build command: npm ci && npm run build
Build output directory: dist
```

Environment variables cua Amplify can co:

```env
VITE_API_BASE=https://api.thuexeoto.online
```

Luu y: Vite dong env vao luc build. Sau khi sua `VITE_API_BASE`, phai redeploy Amplify.

## 3. Sua frontend asset path cho production

File trong `frontend/public` phai duoc goi tu root path.

Vi du video:

```tsx
<source src="/videos/cars-hero.mp4" type="video/mp4" />
```

Khong dung:

```tsx
<source src="public/videos/cars-hero.mp4" type="video/mp4" />
```

Anh trong `frontend/src/assets` nen import bang Vite:

```tsx
import ownerCarImage from '../assets/owner-car.jpg'

<img src={ownerCarImage} alt="" />
```

Khong nen dung path production-sai:

```tsx
<img src="/src/assets/owner-car.jpg" />
```

Kiem tra build local:

```bash
cd /Users/dank/Desktop/Rent-car-platform/frontend
npm run build
```

## 4. Docker backend image

Do Mac Apple Silicon build mac dinh ra `linux/arm64`, trong khi EC2 Ubuntu la `linux/amd64`.

Vi vay khi build image de chay tren EC2, dung `buildx`:

```bash
cd /Users/dank/Desktop/Rent-car-platform

docker buildx build \
  --platform linux/amd64 \
  -t dangkhoi081f/backend-rent-car:2.0 \
  --push .
```

Kiem tra platform:

```bash
docker buildx imagetools inspect dangkhoi081f/backend-rent-car:2.0
```

Phai thay:

```text
linux/amd64
```

Neu tag image cu:

```bash
docker tag backend-rent-car:1.0 dangkhoi081f/backend-rent-car:2.0
docker push dangkhoi081f/backend-rent-car:2.0
```

Luu y: `docker tag backend-rent-car ...` se bi loi neu khong co `backend-rent-car:latest`.

## 5. Docker Compose tren EC2

Vi du `docker-compose.yml` tren EC2:

```yaml
services:
  mysql:
    image: mysql:lts
    container_name: UngDungGoiXe
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: 12345
      MYSQL_DATABASE: UngDungGoiXe
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-networks

  redis:
    image: redis:8.6.2
    container_name: redis_be
    ports:
      - "6379:6379"
    command: ["redis-server", "--requirepass", "12345678"]
    networks:
      - app-networks

  backend-rent:
    image: dangkhoi081f/backend-rent-car:2.0
    env_file:
      - .env
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
    networks:
      - app-networks

volumes:
  mysql_data:

networks:
  app-networks:
```

Pull va restart backend:

```bash
sudo docker compose pull backend-rent
sudo docker compose up -d backend-rent
```

Xem container:

```bash
sudo docker compose ps
```

Xem log:

```bash
sudo docker compose logs -f backend-rent
```

## 6. File `.env` backend tren EC2

Vi du cac bien can co, khong commit secret that vao GitHub:

```env
SPRING_PROFILES_ACTIVE=prod

MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=12345

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=12345678

JWT_SECRET=YOUR_JWT_SECRET
JWT_AUDIENCE=ungdunggoixe-client

EMAIL_USERNAME=YOUR_EMAIL
EMAIL_PASSWORD=YOUR_EMAIL_APP_PASSWORD

OAUTH_GOOGLE_ID=YOUR_GOOGLE_CLIENT_ID
OAUTH_GOOGLE_SECRET=YOUR_GOOGLE_CLIENT_SECRET

AWS_ACCESS_KEY=YOUR_AWS_ACCESS_KEY
AWS_SECRET_KEY=YOUR_AWS_SECRET_KEY
BUCKET_NAME=YOUR_BUCKET_NAME
REGION=ap-southeast-1

APP_CORS_ALLOWED_ORIGINS=https://thuexeoto.online,https://www.thuexeoto.online,https://mas3.d3lv0pu0fwaknn.amplifyapp.com
APP_WEB_BASE_URL=https://www.thuexeoto.online
```

Sau khi sua `.env`, restart backend:

```bash
sudo docker compose up -d backend-rent
```

## 7. CORS trong Spring Security

Backend can cho phep frontend domain goi API.

Trong `SecurityConfiguration.java`, can bat CORS:

```java
http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
    .csrf(AbstractHttpConfigurer::disable)
```

Va CORS source doc tu property/env:

```java
@Value("${app.cors.allowed-origins:http://localhost:5173}")
private String allowedOrigins;

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration corsConfig = new CorsConfiguration();
    corsConfig.setAllowCredentials(true);
    corsConfig.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList());
    corsConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    corsConfig.setAllowedHeaders(List.of("*"));
    corsConfig.setExposedHeaders(List.of("Authorization"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", corsConfig);
    return source;
}
```

Khong dung:

```java
setAllowCredentials(true)
setAllowedOrigins(List.of("*"))
```

Vi credentials khong hop le voi wildcard origin.

## 8. Domain frontend tren Amplify

Domain:

```text
thuexeoto.online
www.thuexeoto.online
```

Neu dung DNS o Hostinger, khong can mua hosting package cua Hostinger. Chi can domain va DNS record.

Trong Amplify:

```text
Hosting -> Custom domains -> Add domain
```

Them:

```text
thuexeoto.online      -> branch deploy
www.thuexeoto.online  -> branch deploy
```

Amplify se tao SSL mien phi cho frontend.

Neu Amplify yeu cau nameserver Route 53 thi co 2 cach:

1. Chuyen nameserver domain sang Route 53.
2. Hoac giu DNS o Hostinger va them CNAME/TXT record Amplify dua ra.

Trong qua trinh nay, da giu DNS o Hostinger cho nhanh.

## 9. DNS backend

Tao A record:

```text
Type: A
Name: api
Value: 13.228.161.189
TTL: 300
```

Kiem tra:

```bash
dig A api.thuexeoto.online
```

Ket qua dung:

```text
api.thuexeoto.online. 300 IN A 13.228.161.189
```

## 10. Gan Elastic IP cho EC2

Trong AWS:

```text
EC2 -> Network & Security -> Elastic IPs -> Allocate Elastic IP address
```

Sau do:

```text
Actions -> Associate Elastic IP address
Resource type: Instance
Instance: chon EC2 backend
Private IP address: chon IP private mac dinh
```

Sau khi gan Elastic IP, cap nhat DNS:

```text
A api -> ELASTIC_IP
```

Luu y: Elastic IP nen duoc gan voi EC2 dang chay. Elastic IP khong gan hoac de idle co the bi tinh phi.

## 11. Nginx reverse proxy tren EC2

Cai Nginx va Certbot:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Tao config:

```bash
sudo nano /etc/nginx/sites-available/rent-car-api
```

Noi dung:

```nginx
server {
    listen 80;
    server_name api.thuexeoto.online;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/rent-car-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 12. Cap HTTPS cho backend bang Certbot

Truoc khi chay certbot, Security Group cua EC2 phai mo:

```text
HTTP  80   0.0.0.0/0
HTTPS 443  0.0.0.0/0
```

Chay:

```bash
sudo certbot --nginx -d api.thuexeoto.online
```

Neu thanh cong:

```text
Successfully received certificate.
Successfully deployed certificate for api.thuexeoto.online
Congratulations! You have successfully enabled HTTPS on https://api.thuexeoto.online
```

Test:

```text
https://api.thuexeoto.online/swagger-ui/index.html
```

Sau khi HTTPS hoat dong, co the dong public port `8080` trong EC2 Security Group. Chi giu:

```text
80
443
```

Backend Docker van lang nghe `8080` noi bo, Nginx proxy tu `443` vao `127.0.0.1:8080`.

## 13. Database dang luu o dau

MySQL dang chay trong Docker container va du lieu luu trong Docker volume:

```yaml
volumes:
  - mysql_data:/var/lib/mysql
```

Kiem tra volume:

```bash
sudo docker volume ls
```

Du lieu khong mat khi restart container:

```bash
sudo docker compose restart
```

Du lieu co the mat neu xoa volume:

```bash
sudo docker compose down -v
```

Khuyen nghi backup:

```bash
sudo docker exec UngDungGoiXe mysqldump -uroot -p12345 UngDungGoiXe > backup.sql
```

Production tot hon nen dung AWS RDS MySQL de co backup/snapshot rieng.

## 14. Cac loi da gap va cach xu ly

### Docker pull access denied

Loi:

```text
pull access denied for backend-rent-car
```

Nguyen nhan: server chua co image local, Docker co gang pull image khong ton tai tren registry.

Cach xu ly:

- Build image va push len Docker Hub.
- Hoac tren server co source code thi dung `build: .`.

### Dockerfile not found

Loi:

```text
failed to read dockerfile: open Dockerfile: no such file or directory
```

Nguyen nhan: chay `docker compose up --build` o thu muc khong co `Dockerfile`.

Cach xu ly: chay trong dung thu muc project hoac sua `build.context`.

### No matching manifest for linux/amd64

Loi:

```text
no matching manifest for linux/amd64
```

Nguyen nhan: build image tren Mac Apple Silicon thanh `linux/arm64`, EC2 can `linux/amd64`.

Cach xu ly:

```bash
docker buildx build --platform linux/amd64 -t dangkhoi081f/backend-rent-car:2.0 --push .
```

### Video landing bi den / tra ve HTML

Nguyen nhan: asset path sai:

```text
public/videos/cars-hero.mp4
```

Dung:

```text
/videos/cars-hero.mp4
```

### Dang ky hien nguyen index.html

Nguyen nhan: frontend chua set `VITE_API_BASE`, nen goi `/api/users` ve chinh Amplify. Amplify tra ve SPA `index.html`.

Cach xu ly:

```env
VITE_API_BASE=https://api.thuexeoto.online
```

Sau do redeploy.

### Failed to fetch do Mixed Content

Nguyen nhan:

```text
https://frontend -> http://backend
```

Trinh duyet chan HTTP backend khi frontend dang HTTPS.

Cach xu ly: bat HTTPS cho backend bang domain + Nginx + Certbot.

### Certbot NXDOMAIN

Loi:

```text
DNS problem: NXDOMAIN looking up A for api.thuexeoto.online
```

Nguyen nhan: DNS public chua thay record `api`.

Kiem tra:

```bash
dig A api.thuexeoto.online
```

Khi da ra IP EC2 thi chay lai:

```bash
sudo certbot --nginx -d api.thuexeoto.online
```

### Frontend van Failed to fetch sau khi co HTTPS

Nguyen nhan da gap: Amplify build van con API cu `http://54.251.145.239:8080` trong JS bundle.

Cach kiem tra:

```bash
curl -Ls https://www.thuexeoto.online/ | grep assets
curl -L https://www.thuexeoto.online/assets/index-XXXX.js -o /tmp/index.js
grep -E "54\\.251|api\\.thuexeoto|/api" /tmp/index.js
```

Cach xu ly:

- Sua Amplify env `VITE_API_BASE=https://api.thuexeoto.online`.
- Clear cache and redeploy.
- Hard refresh browser: `Cmd + Shift + R`.

## 15. Checklist deploy lai lan sau

1. Sua code local.
2. Build/test backend:

```bash
./mvnw -q -DskipTests compile
```

3. Build/test frontend:

```bash
cd frontend
npm run build
```

4. Build Docker image amd64 va push:

```bash
cd /Users/dank/Desktop/Rent-car-platform
docker buildx build --platform linux/amd64 -t dangkhoi081f/backend-rent-car:2.1 --push .
```

5. Sua EC2 `docker-compose.yml` image tag moi.
6. Pull va restart backend:

```bash
sudo docker compose pull backend-rent
sudo docker compose up -d backend-rent
sudo docker compose logs -f backend-rent
```

7. Push frontend/backend code len GitHub:

```bash
git add .
git commit -m "Deploy update"
git push
```

8. Amplify tu build lai branch da connect.
9. Kiem tra:

```text
https://www.thuexeoto.online
https://api.thuexeoto.online/swagger-ui/index.html
```

