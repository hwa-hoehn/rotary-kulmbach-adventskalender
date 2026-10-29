<?php
// Schnittstelle für Gewinnzahlen und Verwaltung.
//   GET  api.php?aktion=zahlen     öffentlich: alle eingetragenen Gewinnzahlen
//   POST api.php?aktion=zaehlen    öffentlich: {ereignis: aufruf|suche|treffer}, ohne Cookies
//   GET  api.php?aktion=statistik  nur angemeldet: Aufrufe der letzten Tage
//   GET  api.php?aktion=status     angemeldet? plus Schlüssel für schreibende Anfragen
//   POST api.php?aktion=anmelden   {benutzer, passwort}
//   POST api.php?aktion=abmelden   {schluessel}
//   POST api.php?aktion=speichern  {schluessel, jahr, tag, lose[]}
declare(strict_types=1);

require __DIR__ . '/privat/kern.php';

$aktion = $_GET['aktion'] ?? '';

if ($aktion === 'zaehlen') {
    // öffentlich, ohne Sitzung; ungültige Ereignisse werden still ignoriert
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $e = json_decode((string) file_get_contents('php://input'), true)['ereignis'] ?? '';
        if (in_array($e, ['aufruf', 'suche', 'treffer'], true)) {
            zaehlen($e);
        }
    }
    http_response_code(204);
    exit;
}

if ($aktion === 'zahlen') {
    antwort(['zahlen' => json_lesen(ZAHLEN_DATEI) ?: new stdClass()]);
}

sitzung_starten();

switch ($aktion) {
    case 'status':
        if (empty($_SESSION['schluessel'])) {
            $_SESSION['schluessel'] = bin2hex(random_bytes(32));
        }
        antwort([
            'angemeldet' => angemeldet() !== null,
            'benutzer' => angemeldet(),
            'schluessel' => $_SESSION['schluessel'],
        ]);

    case 'anmelden':
        $eingabe = schreibanfrage_pruefen(false);
        if (ist_gesperrt()) {
            fehler('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', 429);
        }
        $name = strtolower(trim((string) ($eingabe['benutzer'] ?? '')));
        $passwort = (string) ($eingabe['passwort'] ?? '');
        $benutzer = benutzer_liste();
        // Auch bei unbekanntem Namen prüfen, damit die Antwortzeit nichts verrät
        $hash = $benutzer[$name] ?? password_hash(random_bytes(16), PASSWORD_DEFAULT);
        $ok = password_verify($passwort, $hash) && isset($benutzer[$name]);
        fehlversuch_merken($ok);
        if (!$ok) {
            protokoll('Anmeldung fehlgeschlagen: ' . substr(preg_replace('/[^a-z0-9._-]/', '', $name), 0, 40));
            fehler('Benutzername oder Passwort falsch.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['benutzer'] = $name;
        $_SESSION['zuletzt'] = time();
        $_SESSION['schluessel'] = bin2hex(random_bytes(32));
        protokoll('Angemeldet: ' . $name);
        antwort(['angemeldet' => true, 'benutzer' => $name, 'schluessel' => $_SESSION['schluessel']]);

    case 'abmelden':
        schreibanfrage_pruefen();
        protokoll('Abgemeldet: ' . (angemeldet() ?? '-'));
        $_SESSION = [];
        session_regenerate_id(true);
        antwort(['angemeldet' => false]);

    case 'speichern':
        $eingabe = schreibanfrage_pruefen();
        $wer = angemeldet();
        if ($wer === null) {
            fehler('Bitte anmelden.', 401);
        }
        $jahr = (int) ($eingabe['jahr'] ?? 0);
        $tag = (int) ($eingabe['tag'] ?? 0);
        $lose = $eingabe['lose'] ?? null;
        if ($jahr < 2020 || $jahr > 2100 || $tag < 1 || $tag > 24 || !is_array($lose)) {
            fehler('Jahr, Tag oder Losnummern ungültig.', 400);
        }
        $sauber = [];
        foreach ($lose as $nr) {
            $nr = (string) $nr;
            if (!preg_match('/^\d{4,8}$/', $nr)) {
                fehler('Ungültige Losnummer: ' . substr(preg_replace('/[^0-9]/', '', $nr), 0, 10), 400);
            }
            $sauber[$nr] = true;
        }
        $sauber = array_map('strval', array_keys($sauber));
        if (count($sauber) > MAX_LOSE_PRO_TAG) {
            fehler('Zu viele Losnummern für einen Tag.', 400);
        }
        $alle = json_aendern(ZAHLEN_DATEI, function (array $d) use ($jahr, $tag, $sauber) {
            $j = (string) $jahr;
            if ($sauber) {
                $d[$j][(string) $tag] = $sauber;
            } else {
                unset($d[$j][(string) $tag]);
                if (empty($d[$j])) {
                    unset($d[$j]);
                }
            }
            return $d;
        });
        protokoll(sprintf('%s: %02d.12.%d mit %d Losnummern gespeichert', $wer, $tag, $jahr, count($sauber)));
        antwort(['gespeichert' => true, 'zahlen' => $alle]);

    case 'statistik':
        if (angemeldet() === null) {
            fehler('Bitte anmelden.', 401);
        }
        $tage = json_lesen(STATISTIK_DATEI)['tage'] ?? [];
        antwort(['tage' => $tage ?: new stdClass(), 'heute' => date('Y-m-d')]);

    default:
        fehler('Unbekannte Aktion.', 404);
}
