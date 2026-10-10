/**
 * Asks public "what is my IP" services where the internet sees this computer. Lizun sends the
 * requests itself (`network.request`), so they leave through the VPN like any other app's.
 */
import { network } from '/__sdk/index.js';

/** A service that does not answer in this time counts as failed, so the next one is tried. */
const TIMEOUT = 8000;
/** A service that said "too many requests" is skipped for this long. */
const COOL_DOWN = 15 * 60 * 1000;

const HEADERS = { Accept: 'application/json', 'User-Agent': 'Lizun-IP-location/1.0' };

/**
 * @typedef {object} Place
 * @property {string} ip
 * @property {string} countryCode  ISO 3166-1 alpha-2, upper case, or ''
 * @property {string} country      Country name as the service gives it, or ''
 * @property {string} region
 * @property {string} city
 * @property {string} provider     ISP or organisation name
 * @property {string} asn          Such as 'AS9009', or ''
 * @property {string} source       Host of the service that answered
 */

class RateLimited extends Error {}

const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const asn = (value) => (value ? `AS${String(value).replace(/^AS/i, '')}` : '');

const PROVIDERS = [
  {
    url: 'https://ipwho.is/',
    read(data) {
      if (data.success === false) {
        if (/limit/i.test(data.message ?? '')) throw new RateLimited(data.message);
        throw new Error(data.message || 'ipwho.is failed');
      }
      const connection = data.connection ?? {};
      return {
        ip: clean(data.ip),
        countryCode: clean(data.country_code),
        country: clean(data.country),
        region: clean(data.region),
        city: clean(data.city),
        // `org` is often a placeholder such as "Private Customer"; the ISP is the useful name.
        provider: clean(connection.isp) || clean(connection.org),
        asn: asn(connection.asn),
      };
    },
  },
  {
    url: 'https://ipapi.co/json/',
    read(data) {
      if (data.error) {
        if (/rate/i.test(data.reason ?? '')) throw new RateLimited(data.reason);
        throw new Error(data.reason || 'ipapi.co failed');
      }
      return {
        ip: clean(data.ip),
        countryCode: clean(data.country_code) || clean(data.country),
        country: clean(data.country_name),
        region: clean(data.region),
        city: clean(data.city),
        provider: clean(data.org),
        asn: asn(clean(data.asn)),
      };
    },
  },
  {
    url: 'https://ipinfo.io/json',
    read(data) {
      // `org` is "AS9009 M247 Europe SRL".
      const org = clean(data.org).match(/^(AS\d+)\s+(.*)$/i);
      return {
        ip: clean(data.ip),
        countryCode: clean(data.country),
        country: '',
        region: clean(data.region),
        city: clean(data.city),
        provider: org ? org[2] : clean(data.org),
        asn: org ? org[1].toUpperCase() : '',
      };
    },
  },
];

/** When each service may be asked again after it rate-limited us, by URL. */
const coolingUntil = new Map();

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT)));
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getJson(url) {
  const response = await withTimeout(network.request(url, { headers: HEADERS }));
  if (response.status === 429) throw new RateLimited('HTTP 429');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * The place from the first service that answers, trying them in order.
 * @returns {Promise<Place>} rejects when every service failed
 */
export async function lookUpPlace() {
  const errors = [];
  for (const provider of PROVIDERS) {
    if ((coolingUntil.get(provider.url) ?? 0) > Date.now()) continue;
    try {
      const place = provider.read(await getJson(provider.url));
      if (!place.ip) throw new Error('no IP in the answer');
      place.countryCode = place.countryCode.toUpperCase();
      place.source = new URL(provider.url).host;
      return place;
    } catch (error) {
      if (error instanceof RateLimited) coolingUntil.set(provider.url, Date.now() + COOL_DOWN);
      errors.push(`${provider.url}: ${error.message}`);
    }
  }
  throw new Error(errors.join('; ') || 'every service is rate-limited');
}

/** The computer's public IPv6 address, or '' when it has none (the request then fails). */
export async function lookUpIpv6() {
  try {
    const data = await getJson('https://api6.ipify.org?format=json');
    const ip = clean(data.ip);
    return ip.includes(':') ? ip : '';
  } catch {
    return '';
  }
}
