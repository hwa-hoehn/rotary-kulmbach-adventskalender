<?php
// Legt einen Benutzer für die Verwaltung an oder ändert sein Passwort.
// Aufruf im Terminal (nicht im Browser):  php werkzeuge/benutzer-anlegen.php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$datei = dirname(__DIR__) . '/privat/benutzer.php';
$liste = is_file($datei) ? (require $datei) : [];

$name = strtolower(trim((string) readline('Benutzername (z. B. rzietz): ')));
if (!preg_match('/^[a-z0-9._-]{3,40}$/', $name)) {
    fwrite(STDERR, "Nur Kleinbuchstaben, Ziffern, Punkt, Minus, Unterstrich (3 bis 40 Zeichen).\n");
    exit(1);
}

function verdeckt(string $frage): string
{
    echo $frage;
    system('stty -echo');
    $eingabe = rtrim((string) fgets(STDIN), "\r\n");
    system('stty echo');
    echo "\n";
    return $eingabe;
}

$pw = verdeckt('Passwort (mindestens 12 Zeichen): ');
if (strlen($pw) < 12) {
    fwrite(STDERR, "Zu kurz.\n");
    exit(1);
}
if (verdeckt('Passwort wiederholen: ') !== $pw) {
    fwrite(STDERR, "Die Passwörter stimmen nicht überein.\n");
    exit(1);
}

$liste[$name] = password_hash($pw, PASSWORD_DEFAULT);
ksort($liste);
$inhalt = "<?php\n// Benutzer der Verwaltung. Erzeugt mit werkzeuge/benutzer-anlegen.php, nicht von Hand ändern.\nreturn " . var_export($liste, true) . ";\n";
file_put_contents($datei, $inhalt, LOCK_EX);
chmod($datei, 0640);
echo 'Gespeichert: ' . $name . ' (' . count($liste) . " Benutzer insgesamt)\n";
echo "privat/benutzer.php jetzt per SFTP hochladen.\n";
