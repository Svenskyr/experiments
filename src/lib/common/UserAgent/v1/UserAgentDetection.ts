interface UserAgentInfo {
    device_type: string;
    operating_system: string;
    browser: string;
    browser_version: string;
    user_agent: string;
}

export function detectUserAgent(): UserAgentInfo {
    const user_agent = navigator.userAgent;
    const device_type = /Mobi|Android/i.test(user_agent) ? "Mobile" : "Desktop";
    const operating_system = detectOperatingSystem(user_agent);
    const { browser, browser_version } = detectBrowser(user_agent);

    const userAgentInfo: UserAgentInfo = {
        device_type,
        operating_system,
        browser,
        browser_version,
        user_agent,
    };

    return userAgentInfo;
}

function detectOperatingSystem(userAgent: string): string {
    if (/Windows NT/i.test(userAgent)) {
        return "Windows";
    } else if (/Macintosh/i.test(userAgent)) {
        return "MacOS";
    } else if (/Linux/i.test(userAgent)) {
        return "Linux";
    } else if (/Android/i.test(userAgent)) {
        return "Android";
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        return "iOS";
    }
    return "Unknown";
}

function detectBrowser(userAgent: string): { browser: string; browser_version: string } {
    let browserName = "Unknown";
    let browserVersion = "Unknown";

    if (/Chrome\/(\d+)/.test(userAgent) && !/Edge\/(\d+)/.test(userAgent)) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/Chrome\/(\d+)/)![1];
    } else if (/Firefox\/(\d+)/.test(userAgent)) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/Firefox\/(\d+)/)![1];
    } else if (/Safari\/(\d+)/.test(userAgent) && !/Chrome\/(\d+)/.test(userAgent)) {
        browserName = "Safari";
        browserVersion = userAgent.match(/Version\/(\d+)/)![1];
    } else if (/Edge\/(\d+)/.test(userAgent)) {
        browserName = "Edge";
        browserVersion = userAgent.match(/Edge\/(\d+)/)![1];
    } else if (/OPR\/(\d+)/.test(userAgent)) {
        browserName = "Opera";
        browserVersion = userAgent.match(/OPR\/(\d+)/)![1];
    }

    return { browser: browserName, browser_version: browserVersion };
}
