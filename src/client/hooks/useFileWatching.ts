import { useState, useRef, useEffect } from "react";
import { hasServer, getSession } from "../lib/api";
import { WatchClient } from "../lib/watchClient";
import { makeTab } from "./useTabManager";
import type { Tab } from "./useTabManager";

export function useFileWatching(
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>,
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>,
) {
  const [watching, setWatching] = useState(false);
  const watchClientRef = useRef<WatchClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!await hasServer()) return;
      const session = await getSession();
      if (cancelled || session.files.length === 0) return;

      const newTabs = session.files.map((f) => makeTab(f.content, f.path, f.path));
      setTabs(newTabs);
      setActiveTabId(newTabs[0].id);

      // Set up file watching
      const client = new WatchClient();
      watchClientRef.current = client;
      client.onFileChange((path, content) => {
        setTabs((prev) =>
          prev.map((t) => (t.watchedPath === path ? { ...t, source: content } : t))
        );
      });
      client.connect();
      setWatching(true);

      for (const f of session.files) {
        client.watchFile(f.path);
      }
    })();
    return () => {
      cancelled = true;
      watchClientRef.current?.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { watching };
}
