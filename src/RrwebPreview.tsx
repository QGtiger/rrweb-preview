import { Allotment } from "allotment";
import "allotment/dist/style.css";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { eventWithTime } from "@rrweb/types";
import {
  Button,
  Input,
  InputRef,
  message,
  Result,
  Segmented,
  Space,
  Upload,
} from "antd";
import { areEventsValid, readFile } from "./utils";
import classNames from "classnames";

import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

const Store = createContext<{
  events: eventWithTime[];
  setEvents: (events: eventWithTime[]) => void;
}>({
  events: [],
  setEvents: () => {},
});

function StoreProvide({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<eventWithTime[]>([]);
  const _evnets = useMemo(() => {
    return {
      events,
      setEvents: (events: eventWithTime[]) => {
        if (areEventsValid(events)) {
          setEvents(events);
        } else {
          message.error("无效的rrweb录制文件");
        }
      },
    };
  }, [events, setEvents]);

  return <Store.Provider value={_evnets}>{children}</Store.Provider>;
}

type OptionType = "file" | "url";

interface Option {
  value: OptionType;
  label: string;
}

const options: Option[] = [
  {
    value: "file",
    label: "本地文件",
  },
  {
    value: "url",
    label: "在线CDN",
  },
];

function LeftPane() {
  const [opt, setOpt] = useState<OptionType>("url");
  const [fileUid, setFileUid] = useState<string | null>(null);
  const { setEvents } = useContext(Store);
  const [url, setUrl] = useState<string>("");
  const [urlMap, setUrlMap] = useState<Record<string, eventWithTime[]>>({});
  const [fileUidMap, setUidMap] = useState<Record<string, eventWithTime[]>>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const setPanelEvents = useCallback(
    (events: eventWithTime[], panelKey: OptionType) => {
      if (panelKey !== opt) return;
      setEvents(events);
    },
    [opt, setEvents]
  );

  const setFileWithUid = (file: File, uid: string) => {
    if (fileUidMap[uid]) {
      setFileUid(uid);
      return;
    }
    readFile(file).then((content) => {
      setUidMap({ ...fileUidMap, [uid]: JSON.parse(content) });
      setFileUid(uid);
    });
  };

  const loadUrl = (url: string) => {
    // 链接正则判断
    if (!/^(http|https):\/\//.test(url)) {
      message.error("请输入正确的链接地址");
      return;
    } else if (urlMap[url]) {
      setUrl(url);
      return;
    }
    setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then(
        (data) => {
          setUrlMap({ ...urlMap, [url]: data });
          setUrl(url);
        },
        () => {
          message.error("加载失败");
        }
      )
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (opt === "file") {
      setPanelEvents(fileUidMap[fileUid || ""] || [], opt);
    } else {
      setPanelEvents(urlMap[url] || [], opt);
    }
  }, [url, urlMap, opt, fileUidMap, fileUid, setPanelEvents]);

  return (
    <div className="p-4">
      <Segmented<string>
        options={options}
        value={opt}
        onChange={(value) => {
          setOpt(value as OptionType);
        }}
      />

      <div className="mt-3">
        <div className={classNames({ hidden: opt !== "file" })}>
          <Upload.Dragger
            beforeUpload={(file) => {
              setFileWithUid(file, file.uid);
              return false;
            }}
            accept=".json"
            itemRender={(node, file) => {
              return (
                <div
                  onClick={() => {
                    setFileWithUid(file.originFileObj as File, file.uid);
                  }}
                  className={classNames({
                    " ring-2 cursor-pointer": fileUid === file.uid,
                  })}
                >
                  {node}
                </div>
              );
            }}
          >
            <p className="ant-upload-text">拖拽或者选择文件上传rrweb录制文件</p>
            <p className="ant-upload-hint">
              支持单个文件上传，支持rrweb录制文件格式
            </p>
          </Upload.Dragger>
        </div>
        <div className={classNames({ hidden: opt == "file" })}>
          <Space.Compact className="w-full">
            <Input placeholder="输入在线CDN地址" ref={inputRef} />
            <Button
              type="primary"
              onClick={() => {
                loadUrl(inputRef.current?.input?.value || "");
              }}
              loading={loading}
            >
              加载
            </Button>
          </Space.Compact>
          <div className="list mt-2">
            {Object.keys(urlMap).map((key) => {
              return (
                <div
                  key={key}
                  onClick={() => {
                    setUrl(key);
                  }}
                  className={classNames(
                    "item px-2 py-1 hover:bg-slate-100 cursor-pointer transition-all text-slate-500 text-sm overflow-hidden whitespace text-ellipsis",
                    {
                      "!bg-slate-200": key === url,
                    }
                  )}
                >
                  {key}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Preview() {
  const { events } = useContext(Store);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentPlayerRef = playerRef.current;
    if (!currentPlayerRef || events.length < 2) return;
    const player = new rrwebPlayer({
      target: currentPlayerRef,
      props: {
        events,
        autoPlay: true,
      },
    });

    return () => {
      if (currentPlayerRef) {
        player.getReplayer().destroy();
        currentPlayerRef.innerHTML = "";
      }
    };
  }, [events]);

  return (
    <div
      ref={playerRef}
      className="flex justify-center items-center h-full w-full p-3"
    ></div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="h-full flex justify-center items-center">
      <Result
        status="500"
        title="rrweb 录制文件解析失败"
        subTitle={error.message}
        extra={
          <Button type="primary" onClick={resetErrorBoundary}>
            重置
          </Button>
        }
      />
    </div>
  );
}

export default function RrwebPreview() {
  return (
    <StoreProvide>
      <div className="h-[100vh] flex flex-col">
        <div className="header flex items-center justify-center gap-3 p-2 shadow-md flex-grow-0 flex-shrink-0">
          <div className="icon">
            <img
              src="https://camo.githubusercontent.com/2171a613080b2e139d0b62d6f30fecdf9ed63f2b462e7f1724d01bfbbd2f9581/68747470733a2f2f7777772e72727765622e696f2f66617669636f6e2e706e67"
              alt="rrweb"
              className="w-[40px] h-[40px]"
            />
          </div>
          <div className="text-2xl font-bold">Rrweb Preview</div>
        </div>
        <div className="h-1 flex-1">
          <Allotment defaultSizes={[3, 7]}>
            <Allotment.Pane minSize={400}>
              <LeftPane />
            </Allotment.Pane>
            <Allotment.Pane minSize={500}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Preview />
              </ErrorBoundary>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    </StoreProvide>
  );
}
