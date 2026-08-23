<?php

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Exclude all API routes from CSRF verification for Bearer token auth
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'sanctum/*',
        ]);

        // Alias for role-based access control
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // Trust all hosts in development
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Return JSON for API routes
        $exceptions->shouldRenderJsonWhen(fn(Request $request, \Throwable $e) =>
            $request->expectsJson() || $request->is('api/*')
        );
    })->create();
