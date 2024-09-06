/** 
     * Text transformations before passing a line to MathJS
     */
export function transform(text: string, transformerSettings: TransformerSettings): string {


    /**
     * Wraps things like
     * 2021-1-30
     * 12-30-2021
     * 1/30/2021
     * 2021/12/30
     * 1/30/2021 1:10
     * 1/30/2021 1:10:45
     * 1/30/2021 10:10 AM
     * 1/30/2021 19:10
     * 1/30/2021 19:10 PST
     * 1/30/2021 10:10 PM UTC
     * with date("...")
     * but avoid things already wrapped
     * 
     */
    if (/(?<!date\(\s*\"?\s*\d{0,3})\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}( \d{1,2}:\d{2}(:\d{2})?( [AP]M)?( [A-Z]{3})?)?/.test(text)) {
        text = text.replace(/(?<!date\(\s*\"?\s*\d{0,3})\d{1,4}[-/]\d{1,2}[-/]\d{1,4}( \d{1,2}:\d{2}(:\d{2})?( [AP]M)?( [A-Z]{3})?)?/g, "date(\"$&\")");
    }

    // Replaces date(1-1-2021) with date("1-1-2021"), must avoid detecting date("1-1-2021") though
    if (/date\([^\"]+?\)/.test(text)) {
        text = text.replace(/(date\()([^\"]+?)(\))/g, "$1\"$2\"$3");
    }

    // Removes comment at the end of a line
    if (/\/\/.*/.test(text)) {
        text = text.replace(/\/\/.*/g, "");
    }

    // Removes commas in things like 1,000,000, but not inside one level of () or []
    if (/(?<!\([^)]*)(?<!\[[^\]]*),(\d{3})/.test(text)) {
        text = text.replace(/(?<!\([^)]*)(?<!\[[^\]]*),(\d{3})/g, "$1");
    }

    if (transformerSettings.convertLocalCurrency) {

        const code = transformerSettings.localCurrencyCode;
        const symbol = transformerSettings.localCurrencySymbol;

        const strippingRegex = new RegExp(`\\${symbol}([\\d\\.]+\\s*[A-Z]{3})`, "g");

        // $5USD, $5 AUD, $5.0 CAD, etc will have the $ stripped to work with MathJS
        if (strippingRegex.test(text)) {
            text = text.replace(strippingRegex, "$1");
        }

        const replacingRegex = new RegExp(`\\${symbol}([\\d\\.\\,]+)(?=([^\\d\\.\\,A-Z]|$))(?!\\b\\s*[A-Z]{3})`, "g");

        // $ alone (preceeding a number) will be treated as USD
        if (replacingRegex.test(text)) {
            text = text.replace(replacingRegex, `$1 ${code}`);
        }

        // "in $" will be treated as "in USD"
        const inRegex = new RegExp(`\\bin\\s+\\${symbol}`);

        if (inRegex.test(text)) {
            text = text.replace(inRegex, `in ${code}`);
        }
    }

    // TODO Unhardcode $ and use the configured currency symbol

    // Change "<[$]number [units]|variable> +|- x%" into "[$]<number [units]|variable> +|- ([$]<number [units]|variable> * 100/x)"
    if (/((\$?[\d\.]+\s*\w*)|(\w+))\s*([\+\-])\s*([\d\.]+)\%/.test(text)) {
        text = text.replace(/((\$?[\d\.]+\s*\w*)|(\w+))\s*([\+\-])\s*([\d\.]+)\%/g, "$1 $4 ($1 * $5 / 100)");
    }

    // Change "% off[ of] <number [units]|variable>" to " * -<number [units]|variable> + <number [units]|variable>"
    if (/(?<=%)(\s+off( of)?\s+)((\$?[\d\.]+\s*\w*)|(\w+))/.test(text)) {
        text = text.replace(/(?<=%)(\s+off( of)?\s+)((\$?[\d\.]+\s*\w*)|(\w+))/g, " * -$3 + $3");
    }

    // Change x% into 100/x
    if (/([\d\.\,]+)\%/.test(text)) {
        text = text.replace(/([\d\.\,]+)\%/g, "($1/100)");
    }

    // Change of to *
    if (/ of /.test(text)) {
        text = text.replace(/ of /g, " * ");
    }

    // Replace "x unit ago" with "now - x unit"
    if (/([\d\.]+ [A-Za-z]+) ago/.test(text)) {
        text = text.replace(/([\d\.]+ [A-Za-z]+) ago/g, "now - $1");
    }

    if (transformerSettings.temperatureShortcut) {
        // Replace oF or oC with degF or degC
        if (/(?<=[\s\d\.\/])o([FC])(?![A-Za-z])/.test(text)) {
            text = text.replace(/(?<=[\s\d\.\/])o([FC])(?![A-Za-z])/g, "deg$1");
        }
        // Replace f or c with degF or degC
        if (/(?<!0x)[\s\d]+([fc])\b/.test(text)) {
            text = text.replace(/(?<!0x)([\s\d]+)f\b/g, "$1degF");
            text = text.replace(/(?<!0x)([\s\d]+)c\b/g, "$1degC");
        }
    }

    // Need to protect against keywords being used as variable names

    return text;
}