#!/usr/bin/env python3
"""
Clean & Simple Currency Converter
Supports CLI usage, JSON output, interactive mode, and offline fallback rates.
Standard library only: requires no third-party packages.
"""

import sys
import json
import argparse
import datetime
from urllib import request, error

# Supported world currencies with symbols and full names
CURRENCIES = {
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    "INR": {"name": "Indian Rupee", "symbol": "₹", "flag": "🇮🇳"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
    "CAD": {"name": "Canadian Dollar", "symbol": "CA$", "flag": "🇨🇦"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "🇦🇺"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF", "flag": "🇨🇭"},
    "CNY": {"name": "Chinese Yuan", "symbol": "¥", "flag": "🇨🇳"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "flag": "🇸🇬"},
    "AED": {"name": "UAE Dirham", "symbol": "AED", "flag": "🇦🇪"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$", "flag": "🇳🇿"},
    "SEK": {"name": "Swedish Krona", "symbol": "kr", "flag": "🇸🇪"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr", "flag": "🇳🇴"},
    "MXN": {"name": "Mexican Peso", "symbol": "Mex$", "flag": "🇲🇽"},
    "BRL": {"name": "Brazilian Real", "symbol": "R$", "flag": "🇧🇷"},
    "KRW": {"name": "South Korean Won", "symbol": "₩", "flag": "🇰🇷"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "flag": "🇿🇦"},
    "HKD": {"name": "Hong Kong Dollar", "symbol": "HK$", "flag": "🇭🇰"},
    "THB": {"name": "Thai Baht", "symbol": "฿", "flag": "🇹🇭"},
    "TRY": {"name": "Turkish Lira", "symbol": "₺", "flag": "🇹🇷"},
    "PLN": {"name": "Polish Zloty", "symbol": "zł", "flag": "🇵🇱"},
    "SAR": {"name": "Saudi Riyal", "symbol": "SAR", "flag": "🇸🇦"},
    "MYR": {"name": "Malaysian Ringgit", "symbol": "RM", "flag": "🇲🇾"},
    "IDR": {"name": "Indonesian Rupiah", "symbol": "Rp", "flag": "🇮🇩"},
    "PHP": {"name": "Philippine Peso", "symbol": "₱", "flag": "🇵🇭"},
}

# Reliable baseline rates against USD (used if network is offline)
BASELINE_RATES_USD = {
    "USD": 1.0,
    "EUR": 0.925,
    "GBP": 0.792,
    "INR": 86.82,
    "JPY": 154.60,
    "CAD": 1.412,
    "AUD": 1.562,
    "CHF": 0.887,
    "CNY": 7.245,
    "SGD": 1.348,
    "AED": 3.673,
    "NZD": 1.734,
    "SEK": 10.65,
    "NOK": 11.02,
    "MXN": 20.35,
    "BRL": 5.82,
    "KRW": 1422.50,
    "ZAR": 18.25,
    "HKD": 7.78,
    "THB": 34.20,
    "TRY": 35.80,
    "PLN": 4.02,
    "SAR": 3.75,
    "MYR": 4.45,
    "IDR": 16250.0,
    "PHP": 58.40,
}

import os

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rates_cache.json")
CACHE_TTL_SECONDS = 600  # 10 minutes

def get_cached_rates(base):
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
                if base in cache:
                    entry = cache[base]
                    cached_time = entry.get("time_epoch", 0)
                    if (datetime.datetime.utcnow().timestamp() - cached_time) < CACHE_TTL_SECONDS:
                        return entry["data"]
    except Exception:
        pass
    return None

def save_cached_rates(base, data):
    try:
        cache = {}
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
        cache[base] = {
            "time_epoch": datetime.datetime.utcnow().timestamp(),
            "data": data
        }
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f)
    except Exception:
        pass

def fetch_live_rates(base="USD"):
    """Fetch live rates from open API with graceful fallback and local caching."""
    base = base.upper()
    cached = get_cached_rates(base)
    if cached:
        return cached

    url = f"https://open.er-api.com/v6/latest/{base}"
    try:
        req = request.Request(url, headers={"User-Agent": "PythonCurrencyConverter/1.0"})
        with request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("result") == "success" and "rates" in data:
                    res = {
                        "source": "live_api",
                        "rates": data["rates"],
                        "last_updated": data.get("time_last_update_utc", datetime.datetime.utcnow().isoformat() + "Z")
                    }
                    save_cached_rates(base, res)
                    return res
    except Exception:
        pass
    
    # Calculate baseline conversion relative to requested base
    base_in_usd = BASELINE_RATES_USD.get(base, 1.0)
    calculated_rates = {}
    for code, rate in BASELINE_RATES_USD.items():
        calculated_rates[code] = round(rate / base_in_usd, 6)

    res = {
        "source": "fallback_offline",
        "rates": calculated_rates,
        "last_updated": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }
    return res

def convert(amount, from_curr, to_curr):
    """Converts amount from from_curr to to_curr."""
    from_curr = from_curr.upper()
    to_curr = to_curr.upper()
    
    rates_data = fetch_live_rates(from_curr)
    rates = rates_data["rates"]
    
    if to_curr not in rates:
        raise ValueError(f"Target currency '{to_curr}' is not available.")
    
    rate = rates[to_curr]
    result = amount * rate
    inverse_rate = 1.0 / rate if rate != 0 else 0.0

    return {
        "amount": amount,
        "from": from_curr,
        "to": to_curr,
        "rate": rate,
        "inverse_rate": round(inverse_rate, 6),
        "result": round(result, 4),
        "source": rates_data["source"],
        "timestamp": rates_data["last_updated"],
        "from_details": CURRENCIES.get(from_curr, {"name": from_curr, "symbol": from_curr, "flag": ""}),
        "to_details": CURRENCIES.get(to_curr, {"name": to_curr, "symbol": to_curr, "flag": ""}),
    }

def print_pretty_result(data):
    """Prints a clean human-readable result."""
    from_sym = data["from_details"].get("symbol", "")
    to_sym = data["to_details"].get("symbol", "")
    
    print("-" * 52)
    print("   CURRENCY CONVERTER (Python Engine)")
    print("-" * 52)
    print(f" Converted: {from_sym}{data['amount']:,.2f} {data['from']} -> {to_sym}{data['result']:,.2f} {data['to']}")
    print(f" Exchange Rate: 1 {data['from']} = {data['rate']:.4f} {data['to']}")
    print(f" Inverse Rate:  1 {data['to']} = {data['inverse_rate']:.4f} {data['from']}")
    print(f" Source:        {data['source']} ({data['timestamp']})")
    print("-" * 52)

def interactive_mode():
    """Runs a friendly CLI prompt loop."""
    print("=" * 52)
    print("       Python Simple Currency Converter")
    print("=" * 52)
    print("Available Currencies:", ", ".join(list(CURRENCIES.keys())[:12]), "...")
    print("Type 'q' to quit anytime.\n")
    
    while True:
        try:
            amt_input = input("Enter amount [e.g. 100]: ").strip()
            if amt_input.lower() in ("q", "quit", "exit"):
                break
            amount = float(amt_input)
            
            from_curr = input("From currency [e.g. USD]: ").strip().upper()
            if from_curr.lower() in ("q", "quit", "exit"):
                break
            
            to_curr = input("To currency [e.g. EUR]: ").strip().upper()
            if to_curr.lower() in ("q", "quit", "exit"):
                break
            
            data = convert(amount, from_curr, to_curr)
            print_pretty_result(data)
            print()
        except KeyboardInterrupt:
            print("\nExiting.")
            break
        except Exception as e:
            print(f"Error: {e}\n")

def main():
    parser = argparse.ArgumentParser(description="Clean Python Currency Converter")
    parser.add_argument("pos_amount", nargs="?", type=float, help="Amount to convert")
    parser.add_argument("pos_from", nargs="?", type=str, help="From currency (e.g. USD)")
    parser.add_argument("pos_to", nargs="?", type=str, help="To currency (e.g. EUR)")
    parser.add_argument("-a", "--amount", type=float, help="Amount to convert")
    parser.add_argument("-f", "--from", dest="from_curr", type=str, help="From currency")
    parser.add_argument("-t", "--to", dest="to_curr", type=str, help="To currency")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    parser.add_argument("-i", "--interactive", action="store_true", help="Run interactive mode")
    parser.add_argument("--list", action="store_true", help="List supported currencies")

    args = parser.parse_args()

    if args.list:
        if args.json:
            print(json.dumps(CURRENCIES, indent=2))
        else:
            print("Supported Currencies:")
            for code, meta in sorted(CURRENCIES.items()):
                print(f"  {code:4} - {meta['flag']} {meta['name']} ({meta['symbol']})")
        return

    amount = args.amount if args.amount is not None else args.pos_amount
    from_curr = args.from_curr if args.from_curr is not None else args.pos_from
    to_curr = args.to_curr if args.to_curr is not None else args.pos_to

    if args.interactive or (amount is None and from_curr is None and to_curr is None):
        interactive_mode()
        return

    if amount is None or from_curr is None or to_curr is None:
        print("Usage: python3 currency_converter.py <amount> <from_currency> <to_currency> [--json]")
        print("Example: python3 currency_converter.py 100 USD EUR")
        sys.exit(1)

    try:
        data = convert(amount, from_curr, to_curr)
        if args.json:
            print(json.dumps(data, indent=2))
        else:
            print_pretty_result(data)
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e)}))
        else:
            print(f"Conversion Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
