import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Banner,
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Table,
  Tag,
  Toast,
  Typography
} from "@douyinfe/semi-ui";
import { IconRefresh, IconServer } from "@douyinfe/semi-icons";
import "@douyinfe/semi-ui/dist/css/semi.min.css";
import "./styles.css";

const { Title, Text } = Typography;

function RuntimeApp() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadState() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/state");
      if (!response.ok) throw new Error(`GET /api/state failed with ${response.status}`);
      setState(await response.json());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshServerState() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      if (!response.ok) throw new Error(`POST /api/refresh failed with ${response.status}`);
      const payload = await response.json();
      setState(payload.state);
      Toast.success("Server state saved");
    } catch (nextError) {
      setError(nextError.message);
      Toast.error("Server update failed");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadState();
  }, []);

  const rows = useMemo(() => state?.checks || [], [state]);
  const columns = [
    {
      title: "Check",
      dataIndex: "name"
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={value === "ready" ? "green" : "grey"}>{value}</Tag>
    }
  ];

  return (
    <main className="runtime-shell">
      <header className="runtime-header">
        <div>
          <Space align="center">
            <IconServer aria-hidden="true" />
            <Text type="tertiary">jun-ui runtime app lane</Text>
          </Space>
          <Title heading={1}>Runtime App Example</Title>
          <Text type="secondary">
            A server-backed product surface using the same tokens and Semi Design System contract.
          </Text>
        </div>
        <Space wrap>
          <Tag color="blue">runtime app</Tag>
          <Tag color="green">server-owned API</Tag>
          <Button icon={<IconRefresh />} onClick={loadState}>
            Reload
          </Button>
        </Space>
      </header>

      {error ? (
        <Banner
          type="danger"
          fullMode={false}
          title="Runtime error"
          description={error}
          className="runtime-banner"
        />
      ) : null}

      {loading ? (
        <Card className="runtime-card">
          <Spin tip="Loading server state..." />
        </Card>
      ) : state ? (
        <>
          <section className="runtime-grid" aria-label="Runtime metrics">
            <Card className="runtime-card">
              <Text type="tertiary">Server status</Text>
              <strong>{state.status}</strong>
            </Card>
            <Card className="runtime-card">
              <Text type="tertiary">Queue depth</Text>
              <strong>{state.queueDepth}</strong>
            </Card>
            <Card className="runtime-card">
              <Text type="tertiary">Saved count</Text>
              <strong>{state.savedCount}</strong>
            </Card>
          </section>

          <section className="runtime-workspace" aria-label="Runtime workspace">
            <Card className="runtime-card">
              <Space vertical align="start" spacing="medium">
                <div>
                  <Title heading={3}>Server-backed action</Title>
                  <Text type="secondary">
                    This button calls POST /api/refresh and mutates in-memory server state.
                  </Text>
                </div>
                <Button
                  theme="solid"
                  type="primary"
                  icon={<IconRefresh />}
                  loading={saving}
                  onClick={refreshServerState}
                >
                  Save server check
                </Button>
                <Descriptions
                  align="plain"
                  data={[
                    { key: "Mode", value: state.mode },
                    { key: "Last refresh", value: state.lastRefresh }
                  ]}
                />
              </Space>
            </Card>

            <Card className="runtime-card">
              <Title heading={3}>Runtime checks</Title>
              {rows.length ? (
                <Table
                  size="small"
                  pagination={false}
                  columns={columns}
                  dataSource={rows}
                  rowKey="name"
                />
              ) : (
                <Empty title="No checks" description="The server returned an empty check list." />
              )}
            </Card>
          </section>
        </>
      ) : (
        <Card className="runtime-card">
          <Empty title="No state" description="The runtime API did not return state." />
        </Card>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<RuntimeApp />);
