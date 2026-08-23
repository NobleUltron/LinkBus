FROM php:8.3-fpm-alpine

# Install system dependencies & PHP extensions required by Laravel 12
RUN apk add --no-linux-headers --no-cache \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    libzip-dev \
    unzip \
    oniguruma-dev \
    icu-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    bash \
    mysql-client

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip intl opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/backend

# Copy application files
COPY ./backend /var/www/backend

# Set proper file permissions for storage and bootstrap/cache
RUN chown -R www-data:www-data /var/www/backend/storage /var/www/backend/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
