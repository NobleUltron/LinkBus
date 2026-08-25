FROM php:8.3-fpm-alpine

# Install system dependencies & PHP extensions
RUN apk add --no-cache \
    curl nginx libpng-dev libxml2-dev zip libzip-dev unzip \
    oniguruma-dev icu-dev freetype-dev libjpeg-turbo-dev sqlite-dev \
    bash supervisor nodejs npm ca-certificates

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd zip intl opcache

# Copy optimized OPcache configuration
COPY docker/render/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# --- Build React Frontend ---
COPY package*.json ./
RUN npm ci --silent

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js tailwind.config.js ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# --- Install PHP/Laravel Backend ---
COPY backend/ ./backend/

WORKDIR /var/www/backend
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy production frontend assets into Laravel's public directory
RUN cp -r /var/www/dist/. /var/www/backend/public/

# Nginx Configuration for Render
COPY docker/render/nginx.conf /etc/nginx/nginx.conf

# Supervisor: manages Nginx + PHP-FPM + Queue Worker
COPY docker/render/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Storage permissions
RUN chown -R www-data:www-data /var/www/backend/storage /var/www/backend/bootstrap/cache \
    && chmod -R 775 /var/www/backend/storage /var/www/backend/bootstrap/cache

# Entrypoint: migrate & start services
COPY docker/render/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
