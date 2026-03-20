<?php

$base = '.infection.cache/infection';

// Fix junit.xml
$junit = $base . '/junit.xml';
$content = file_get_contents($junit);
$content = str_replace('P\\Tests\\', 'Tests\\', $content);
file_put_contents($junit, $content);
echo "junit.xml fixed\n";

// Fix coverage-xml index and all xml files
$coverageDir = $base . '/coverage-xml';
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($coverageDir));
$count = 0;
foreach ($files as $file) {
    if ($file->getExtension() !== 'xml') {
        continue;
    }
    $content = file_get_contents($file->getPathname());
    if (str_contains($content, 'P\\Tests\\') || str_contains($content, 'P\Tests\\')) {
        $content = str_replace(['P\\Tests\\', 'P\Tests\\'], 'Tests\\', $content);
        file_put_contents($file->getPathname(), $content);
        $count++;
    }
}
echo "coverage-xml fixed ($count files)\n";
