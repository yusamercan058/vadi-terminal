import React, { useEffect, useRef } from 'react';

const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": symbol,
        "interval": "15",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": true,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "hide_volume": true,
        "backgroundColor": "rgba(9, 11, 16, 1)",
        "support_host": "https://www.tradingview.com"
      });
      container.current.appendChild(script);
    }
  }, [symbol]);

  return <div className="h-full w-full bg-[#151921] rounded-none" ref={container} />;
};

export default TradingViewWidget;