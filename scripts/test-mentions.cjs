// @mentions (profils et personnages) et événements (fichier calendrier).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const load = file => { const m = { exports: {} }; new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m.exports); return m.exports; };
const { encodeMention, parseMentions, mentionQuery, insertMention, applyMentions, cleanLabel } = load('lib/mentions.ts');
const { buildIcs, icsText, localToIso, eventEnd, isFull } = load('lib/events.ts');

const uid = '0b6c1f9e-2f7a-4c1e-9d3b-5a8e7f6d4c21';
// Encodage et lecture.
const tok = encodeMention({ kind: 'u', id: uid, label: 'Alpha' });
assert.equal(tok, `@[Alpha](u:${uid})`);
assert.equal(encodeMention({ kind: 'c', id: 'anilist-char-80', label: 'Light [Kira] (Yagami)' }), '@[Light Kira Yagami](c:anilist-char-80)');
assert.deepEqual(parseMentions(`Salut ${tok}, tu as vu @[Light](c:anilist-char-80) ?`), [
  { type: 'text', value: 'Salut ' }, { type: 'mention', kind: 'u', id: uid, label: 'Alpha' },
  { type: 'text', value: ', tu as vu ' }, { type: 'mention', kind: 'c', id: 'anilist-char-80', label: 'Light' }, { type: 'text', value: ' ?' }]);
assert.deepEqual(parseMentions('@[X](u:pas-un-uuid) et @[Y](c:../../admin)'), [{ type: 'text', value: '@[X](u:pas-un-uuid) et @[Y](c:../../admin)' }], 'identifiants invalides : du texte');
assert.deepEqual(parseMentions('mail@exemple.fr'), [{ type: 'text', value: 'mail@exemple.fr' }]);
assert.equal(cleanLabel('  a\nb  '), 'a b'); assert.equal(cleanLabel('x'.repeat(80)).length, 60);

// Saisie : détection de « @requête » avant le curseur.
assert.deepEqual(mentionQuery('Salut @Al', 9), { start: 6, query: 'Al' });
assert.deepEqual(mentionQuery('@', 1), { start: 0, query: '' });
assert.deepEqual(mentionQuery('@Light Yag', 10), { start: 0, query: 'Light Yag' });
assert.equal(mentionQuery('mail@ex', 7), null, 'pas au milieu d’un mot');
assert.equal(mentionQuery('@ Al', 4), null);
assert.equal(mentionQuery('Salut', 5), null);
assert.equal(mentionQuery('@' + 'x'.repeat(31), 32), null);

// Insertion puis envoi : les mentions choisies deviennent des jetons, les autres restent du texte.
let r = insertMention('Salut @Al ça va', 9, 'Alpha');
assert.deepEqual(r, { text: 'Salut @Alpha  ça va', caret: 13 });
r = insertMention(r.text, r.text.length, 'x');
const sent = applyMentions('Salut @Alpha et @Light, @Alpha encore', [{ kind: 'u', id: uid, label: 'Alpha' }, { kind: 'c', id: 'anilist-char-80', label: 'Light' }]);
assert.equal(sent, `Salut @[Alpha](u:${uid}) et @[Light](c:anilist-char-80), @Alpha encore`);
assert.equal(applyMentions('plus de mention', [{ kind: 'u', id: uid, label: 'Alpha' }]), 'plus de mention');
assert.ok(sent.length <= 500);

// Événements : fin par défaut, complet, dates, fichier calendrier échappé.
assert.equal(eventEnd({ starts_at: '2026-12-01T18:00:00.000Z', ends_at: null }).toISOString(), '2026-12-01T21:00:00.000Z');
assert.equal(isFull({ capacity: 2, participants: 2 }), true); assert.equal(isFull({ capacity: null, participants: 99 }), false);
assert.equal(localToIso('2026-13-01', '18:00'), null); assert.equal(localToIso('2026-12-01', '8h'), null);
assert.ok(localToIso('2026-12-01', '18:30'));
assert.equal(icsText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
const ev = { id: 'e1', title: 'Soirée, typage; INTJ', description: 'Ligne 1\nLigne 2', category: 'personnages', starts_at: '2026-12-01T18:00:00.000Z', ends_at: null, mode: 'en_ligne', place: '', online_url: null, capacity: null, cancelled: false, organizer_id: uid, organizer_name: 'Alpha', participants: 0, registered: false, is_organizer: false };
const ics = buildIcs(ev, 'https://slumbywise.com', new Date('2026-11-20T10:00:00Z'));
assert.ok(ics.includes('DTSTART:20261201T180000Z') && ics.includes('DTEND:20261201T210000Z') && ics.includes('DTSTAMP:20261120T100000Z'));
assert.ok(ics.includes('SUMMARY:Soirée\\, typage\\; INTJ'));
assert.ok(ics.includes('LOCATION:En ligne'), 'lien inconnu : pas de lien');
assert.ok(ics.includes('URL:https://slumbywise.com/evenements/?id=e1'));
assert.ok(ics.split('\r\n').every(l => !l.includes('\n')), 'lignes CRLF, texte échappé');
assert.ok(buildIcs({ ...ev, cancelled: true, mode: 'sur_place', place: 'Lille' }, 'https://x').includes('STATUS:CANCELLED'));
console.log('Mentions OK: jetons profil/personnage, identifiants validés, saisie et insertion, envoi ; événements : fin par défaut, complet, dates, fichier .ics échappé.');
