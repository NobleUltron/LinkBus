<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

// Serve React SPA Production Build
Route::get('/{any?}', function () {
    $indexPath = public_path('index.html');
    if (File::exists($indexPath)) {
        return response(File::get($indexPath))->header('Content-Type', 'text/html');
    }
    return view('welcome');
})->where('any', '^(?!api).*$');
