<script lang="ts">
	import { PRIVACY_VERSION } from '$lib/legal';
</script>

<div class="md:container md:mx-auto py-3 h-full overflow-auto">
	<div class="mx-3 md:mx-0 rounded-3xl bg-surface-100-900 p-5 md:p-8 space-y-6">
		<h1 class="h1">Datenschutzerklaerung / Privacy Notice</h1>
		<p class="text-sm opacity-80">
			Stand / Last updated: {PRIVACY_VERSION}
		</p>

		<section class="space-y-2">
			<h2 class="h3">1. Verantwortlicher / Controller</h2>
			<p>
				Paul Graf, <a href="mailto:paulantongraf@gmail.com" class="underline">paulantongraf@gmail.com</a>
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">2. Kontakt fuer Betroffenenrechte / Data Subject Rights Contact</h2>
			<p>
				<strong>DE:</strong> Anfragen zu Auskunft, Berichtigung, Loeschung, Einschraenkung,
				Widerspruch und Datenuebertragbarkeit bitte an:
				<a href="mailto:paulantongraf@gmail.com" class="underline">paulantongraf@gmail.com</a>
			</p>
			<p>
				<strong>EN:</strong> Requests regarding access, rectification, erasure, restriction,
				objection, and data portability:
				<a href="mailto:paulantongraf@gmail.com" class="underline">paulantongraf@gmail.com</a>
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">3. Altersgrenze / Age Restriction</h2>
			<p>
				<strong>DE:</strong> Dieses Angebot richtet sich ausschliesslich an Personen ab 16 Jahren.
				Konten von Personen unter 16 Jahren werden nach Kenntnis geloescht.
			</p>
			<p>
				<strong>EN:</strong> This service is intended only for users aged 16 and above. Accounts of
				users below 16 are deleted once identified.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">4. Verarbeitete Daten / Categories of Data Processed</h2>
			<p>
				<strong>DE:</strong> Wir verarbeiten je nach Nutzung insbesondere: Konto- und
				Profildaten (z. B. Benutzername, E-Mail, Name), Sitzungsdaten (Session-ID, IP, Zeitpunkte),
				Trip- und Positionsdaten (z. B. GPS, Zeit, Geschwindigkeit), Mediendaten (Bilder inkl. ggf.
				EXIF-Standort/Zeit), sowie technische Protokolldaten zur Sicherheit.
			</p>
			<p>
				<strong>EN:</strong> Depending on your use, we process account/profile data (e.g., username,
				email, name), session data (session ID, IP, timestamps), trip/location data (e.g., GPS, time,
				speed), media data (images including possible EXIF location/time), and technical security logs.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">5. Zwecke und Rechtsgrundlagen / Purposes and Legal Bases</h2>
			<div class="overflow-auto">
				<table class="table table-hover w-full text-sm">
					<thead>
						<tr>
							<th>Zweck / Purpose</th>
							<th>Rechtsgrundlage / Legal basis</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>1. Kontoanlage, Login, Session-Verwaltung / Account creation, login, session management</td>
							<td>Vertragserfuellung (Art. 6 Abs. 1 lit. b DSGVO) / Contract performance (Art. 6(1)(b) GDPR)</td>
						</tr>
						<tr>
							<td>2. Profildarstellung / Profile display</td>
							<td>Vertragserfuellung / Contract performance</td>
						</tr>
						<tr>
							<td>3. Trip- und Positionsdaten / Trip and location datapoints</td>
							<td>Vertragserfuellung / Contract performance</td>
						</tr>
						<tr>
							<td>4. Medienuploads inkl. EXIF / Media uploads incl. EXIF</td>
							<td>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) / Legitimate interest (Art. 6(1)(f) GDPR)</td>
						</tr>
						<tr>
							<td>5. Sicherheits- und Zugriffsprotokolle / Security and access logging</td>
							<td>Berechtigtes Interesse / Legitimate interest</td>
						</tr>
						<tr>
							<td>6. Sichtbarkeitsbasierte Freigaben / Visibility-based sharing</td>
							<td>Vertragserfuellung / Contract performance</td>
						</tr>
						<tr>
							<td>7. Bearbeitung von Betroffenenanfragen / Handling rights requests</td>
							<td>Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO) / Legal obligation (Art. 6(1)(c) GDPR)</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="text-sm opacity-80">
				<strong>DE:</strong> Soweit die Verarbeitung fuer die Vertragserfuellung erforderlich ist, besteht ohne
				diese Datenverarbeitung keine oder nur eingeschraenkte Nutzbarkeit des Dienstes.
			</p>
			<p class="text-sm opacity-80">
				<strong>EN:</strong> Where processing is necessary for contract performance, the service cannot be
				provided (or only in a limited form) without that processing.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">6. Empfaenger und Drittlandtransfers / Recipients and Third-Country Transfers</h2>
			<p>
				<strong>DE:</strong> Hosting erfolgt bei Hetzner in Deutschland. Es bestehen derzeit keine
				externen E-Mail-Dienstleister. Bei Nutzung externer Kartenkacheln/Fonts koennen Verbindungen
				zu Drittanbietern entstehen.
			</p>
			<p>
				<strong>EN:</strong> Hosting is provided by Hetzner in Germany. There is currently no external
				email provider. Use of external map tiles/fonts may create connections to third-party providers.
			</p>
			<p>
				<strong>DE:</strong> Die Kartenansicht ist fester Bestandteil des Dienstes. Kartenkacheln werden
				regelmaessig von folgenden Endpunkten abgerufen:
				<code>https://tile.openstreetmap.org/{`{z}`}/{`{x}`}/{`{y}`}.png</code> (OpenStreetMap) und
				<code>https://t1.openseamap.org/seamark/{`{z}`}/{`{x}`}/{`{y}`}.png</code> (OpenSeaMap).
				Dabei werden technisch notwendige Verbindungsdaten (z. B. IP-Adresse, User-Agent) an diese
				Anbieter uebermittelt.
			</p>
			<p>
				<strong>EN:</strong> Map view is an integral part of the service. Map tiles are regularly requested from:
				<code>https://tile.openstreetmap.org/{`{z}`}/{`{x}`}/{`{y}`}.png</code> (OpenStreetMap) and
				<code>https://t1.openseamap.org/seamark/{`{z}`}/{`{x}`}/{`{y}`}.png</code> (OpenSeaMap).
				This transmits technically required connection data (e.g., IP address, user agent) to these
				providers.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">7. Speicherdauer / Retention</h2>
			<p>
				<strong>DE:</strong> Nutzer und alle zugeordneten Daten werden auf Anfrage innerhalb von
				30 Tagen geloescht. Backups werden rotierend aufbewahrt und spaetestens nach 30 weiteren
				Tagen ueberschrieben; bis dahin kann eine technische Restverfuegbarkeit in Sicherungen bestehen.
			</p>
			<p>
				<strong>EN:</strong> Users and all associated data are deleted upon request within 30 days.
				Backups are retained on a rolling basis and are overwritten no later than an additional
				30 days; until then, residual technical availability in backups may remain.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">8. Cookies</h2>
			<p>
				<strong>DE:</strong> Es wird ein technisch notwendiges Session-Cookie verwendet
				(<code>session_token</code>) fuer Authentifizierung und Sitzungsverwaltung. Ohne dieses Cookie
				kann die Anmeldung nicht funktionieren. Es werden derzeit keine Marketing- oder Tracking-Cookies
				gesetzt.
			</p>
			<p>
				<strong>EN:</strong> A strictly necessary session cookie (<code>session_token</code>) is used
				for authentication and session management. Login cannot function without it. No marketing or
				tracking cookies are currently set.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">9. Ihre Rechte / Your Rights</h2>
			<p>
				<strong>DE:</strong> Sie haben das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung,
				Datenuebertragbarkeit, Widerspruch sowie Widerruf erteilter Einwilligungen.
			</p>
			<p>
				<strong>EN:</strong> You have rights of access, rectification, erasure, restriction, portability,
				objection, and withdrawal of consent.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">10. Beschwerderecht / Right to Lodge a Complaint</h2>
			<p>
				<strong>DE:</strong> Sie koennen sich bei einer Datenschutzaufsichtsbehoerde beschweren, insbesondere
				in dem Mitgliedstaat Ihres Aufenthaltsorts, Arbeitsplatzes oder des Orts des mutmasslichen Verstosses.
			</p>
			<p>
				<strong>EN:</strong> You can lodge a complaint with a data protection supervisory authority,
				in particular in the EU Member State of your habitual residence, place of work, or alleged infringement.
			</p>
		</section>

		<section class="space-y-2">
			<h2 class="h3">11. Datenschutzvorfaelle / Data Breach Response</h2>
			<p>
				<strong>DE:</strong> Bei Verdacht auf einen Datenschutzvorfall erfolgt eine interne Pruefung
				durch den Verantwortlichen. Falls eine Meldepflicht besteht, erfolgt
				die Meldung an die zustaendige Aufsichtsbehoerde unverzueglich und moeglichst innerhalb von
				72 Stunden nach Bekanntwerden (Art. 33 DSGVO). Betroffene Personen werden gemaess Art. 34 DSGVO
				informiert, wenn ein hohes Risiko besteht.
			</p>
			<p>
				<strong>EN:</strong> In case of a suspected personal data breach, an internal assessment is
				handled by the Controller. Where notification is required, the breach is
				reported to the competent supervisory authority without undue delay and, where feasible, within
				72 hours of becoming aware (Art. 33 GDPR). Affected data subjects are informed under Art. 34 GDPR
				where a high risk exists.
			</p>
		</section>
	</div>
</div>
