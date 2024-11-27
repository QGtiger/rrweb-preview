import { Allotment } from "allotment";
import "allotment/dist/style.css";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { eventWithTime } from "@rrweb/types";
import { Button, Input, message, Segmented, Space, Upload } from "antd";
import { readFile } from "./utils";
import classNames from "classnames";

import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";

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
      setEvents,
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
  const [opt, setOpt] = useState<OptionType>("file");
  const [fileUid, setFileUid] = useState<string | null>(null);
  const { setEvents } = useContext(Store);
  const [url, setUrl] = useState<string>("");

  const setFileWithUid = (file: File, uid: string) => {
    readFile(file).then((content) => {
      setEvents(JSON.parse(content));
    });
    setFileUid(uid);
  };

  const loadUrl = (url: string) => {
    // 链接正则判断
    if (!/^(http|https):\/\//.test(url)) {
      message.error("请输入正确的链接地址");
      return;
    }
    fetch(url)
      .then((res) => res.json())
      .then(
        (data) => {
          setEvents(data);
        },
        () => {
          message.error("加载失败");
        }
      );
  };

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
                  className={classNames({ " ring-2": fileUid === file.uid })}
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
            <Input
              placeholder="输入在线CDN地址"
              onChange={(e) => {
                setUrl(e.target.value);
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                loadUrl(url);
              }}
            >
              加载
            </Button>
          </Space.Compact>
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
              <Preview />
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    </StoreProvide>
  );
}
