<?php
// Gemeinsame Funktionen für api.php: Einstellungen, Sitzung, Antworten, Dateien.
// Dieser Ordner darf vom Browser aus nicht erreichbar sein (siehe .htaccess, besser außerhalb des Web-Ordners).
declare(strict_types=1);

date_default_timezone_set('Europe/Berlin');

const DATEN_ORDNER = __DIR__ . '/daten';
const ZAHLEN_DATEI = DATEN_ORDNER . '/gewinnzahlen.json';
const SPERR_DATEI = DATEN_ORDNER . '/fehlversuche.json';
const PROTOKOLL_DATEI = DATEN_ORDNER . '/protokoll.log';
const BENUTZER_DATEI = __DIR__ . '/benutzer.php';
const STATISTIK_DATEI = DATEN_ORDNER . '/statistik.json';

const MAX_FEHLVERSUCHE = 5;          // danach Sperre
const SPERRZEIT = 15 * 60;           // Sekunden
const SITZUNG_LEERLAUF = 2 * 60 * 60; // automatisch abmelden nach 2 Stunden ohne Aktion
const MAX_LOSE_PRO_TAG = 60;

function antwort(array $daten, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

function fehler(string $meldung, int $status): never
{
    antwort(['fehler' => $meldung], $status);
}

function ist_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function sitzung_starten(): void
{
    session_name('rk_verwaltung');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => ist_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();

    if (!empty($_SESSION['benutzer']) && time() - ($_SESSION['zuletzt'] ?? 0) > SITZUNG_LEERLAUF) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    if (!empty($_SESSION['benutzer'])) {
        $_SESSION['zuletzt'] = time();
    }
}

function angemeldet(): ?string
{
    return $_SESSION['benutzer'] ?? null;
}

// Schreibende Anfragen: nur JSON, nur von derselben Seite, nur mit gültigem Schlüssel aus der Sitzung
function schreibanfrage_pruefen(bool $mitSchluessel = true): array
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fehler('Nur POST erlaubt.', 405);
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        fehler('Falsches Format.', 415);
    }
    $herkunft = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($herkunft !== '' && parse_url($herkunft, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
        fehler('Anfrage von fremder Seite.', 403);
    }
    $eingabe = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($eingabe)) {
        fehler('Ungültige Eingabe.', 400);
    }
    if ($mitSchluessel) {
        $schluessel = (string) ($eingabe['schluessel'] ?? '');
        if (empty($_SESSION['schluessel']) || !hash_equals($_SESSION['schluessel'], $schluessel)) {
            fehler('Sitzung abgelaufen. Bitte neu anmelden.', 403);
        }
    }
    return $eingabe;
}

function benutzer_liste(): array
{
    if (!is_file(BENUTZER_DATEI)) {
        return [];
    }
    $liste = require BENUTZER_DATEI;
    return is_array($liste) ? $liste : [];
}

function ordner_sicherstellen(): void
{
    if (!is_dir(DATEN_ORDNER) && !mkdir(DATEN_ORDNER, 0750, true) && !is_dir(DATEN_ORDNER)) {
        fehler('Datenordner fehlt.', 500);
    }
}

// Liest und ändert eine JSON-Datei unter Sperre, damit gleichzeitige Zugriffe nichts überschreiben
function json_aendern(string $datei, callable $aenderung): array
{
    ordner_sicherstellen();
    $h = fopen($datei, 'c+');
    if ($h === false || !flock($h, LOCK_EX)) {
        fehler('Datei nicht beschreibbar.', 500);
    }
    $inhalt = stream_get_contents($h);
    $daten = json_decode($inhalt ?: '{}', true);
    if (!is_array($daten)) {
        $daten = [];
    }
    $daten = $aenderung($daten);
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($h);
    flock($h, LOCK_UN);
    fclose($h);
    return $daten;
}

function json_lesen(string $datei): array
{
    if (!is_file($datei)) {
        return [];
    }
    $h = fopen($datei, 'r');
    if ($h === false) {
        return [];
    }
    flock($h, LOCK_SH);
    $daten = json_decode((string) stream_get_contents($h), true);
    flock($h, LOCK_UN);
    fclose($h);
    return is_array($daten) ? $daten : [];
}

function protokoll(string $zeile): void
{
    ordner_sicherstellen();
    file_put_contents(PROTOKOLL_DATEI, date('Y-m-d H:i:s') . ' ' . $zeile . "\n", FILE_APPEND | LOCK_EX);
}

// Fehlversuche je IP-Adresse (gekürzt gespeichert) zählen
function ip_schluessel(): string
{
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|rk');
}

function ist_gesperrt(): bool
{
    $jetzt = time();
    $liste = json_lesen(SPERR_DATEI)[ip_schluessel()] ?? [];
    $liste = array_filter($liste, fn ($t) => $jetzt - $t < SPERRZEIT);
    return count($liste) >= MAX_FEHLVERSUCHE;
}

function fehlversuch_merken(bool $erfolg): void
{
    $ip = ip_schluessel();
    json_aendern(SPERR_DATEI, function (array $d) use ($ip, $erfolg) {
        $jetzt = time();
        foreach ($d as $k => $liste) {
            $d[$k] = array_values(array_filter($liste, fn ($t) => $jetzt - $t < SPERRZEIT));
            if (!$d[$k]) {
                unset($d[$k]);
            }
        }
        if ($erfolg) {
            unset($d[$ip]);
        } else {
            $d[$ip][] = $jetzt;
        }
        return $d;
    });
}

// Besucherzählung ohne Cookies und ohne gespeicherte IP-Adresse:
// eindeutige Besucher nur über einen täglich wechselnden Zufallswert, der am Folgetag verworfen wird
function zaehlen(string $ereignis): void
{
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless/i', $ua)) {
        return;
    }
    $heute = date('Y-m-d');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    json_aendern(STATISTIK_DATEI, function (array $d) use ($ereignis, $heute, $ua, $ip) {
        if (($d['heute']['datum'] ?? '') !== $heute) {
            $d['heute'] = ['datum' => $heute, 'salz' => bin2hex(random_bytes(16)), 'kennungen' => []];
        }
        $tag = $d['tage'][$heute] ?? ['aufrufe' => 0, 'besucher' => 0, 'suchen' => 0, 'treffer' => 0];
        if ($ereignis === 'aufruf') {
            $tag['aufrufe']++;
            $kennung = substr(hash('sha256', $d['heute']['salz'] . '|' . $ip . '|' . $ua), 0, 16);
            if (!in_array($kennung, $d['heute']['kennungen'], true)) {
                $d['heute']['kennungen'][] = $kennung;
                $tag['besucher']++;
            }
        } elseif ($ereignis === 'suche') {
            $tag['suchen']++;
        } elseif ($ereignis === 'treffer') {
            $tag['treffer']++;
        }
        $d['tage'][$heute] = $tag;
        // nur gut ein Jahr aufheben
        $d['tage'] = array_slice($d['tage'] ?? [], -400, null, true);
        return $d;
    });
}
