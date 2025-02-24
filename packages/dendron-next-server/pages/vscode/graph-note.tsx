import {
  createLogger,
  engineSlice,
  postVSCodeMessage,
} from "@dendronhq/common-frontend";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import cytoscape, {
  EdgeDefinition,
  ElementsDefinition,
  EventHandler,
  Core,
  NodeDefinition,
  EdgeDataDefinition,
} from "cytoscape";
import {
  DMessageSource,
  GraphViewMessage,
  GraphViewMessageType,
  NoteUtils,
  VaultUtils,
} from "@dendronhq/common-all";
import Graph from "../../components/graph";
import { useRouter } from "next/router";
import {
  graphConfig,
  GraphConfig,
  GraphConfigItem,
  GraphEdges,
  GraphNodes,
} from "../../lib/graph";
import GraphFilterView from "../../components/graph-filter-view";
import useGraphElements from "../../hooks/useGraphElements";

export default function FullNoteGraph({
  engine,
}: {
  engine: engineSlice.EngineState;
}) {
  const [config, setConfig] = useState<GraphConfig>(graphConfig.note);

  const elements = useGraphElements({ type: "note", engine });

  const logger = createLogger("Graph");
  logger.log("graph elements:", elements);

  // Update config
  useEffect(() => {
    if (!_.isUndefined(elements)) {
      setConfig((c) => ({
        ...c,
        "information.nodes": {
          value: elements.nodes.length,
          mutable: false,
        },
        "information.edges-hierarchy": {
          value: elements.edges.hierarchy ? elements.edges.hierarchy.length : 0,
          mutable: false,
          label: "Hierarchical Edges",
        },
        "information.edges-links": {
          value: elements.edges.links ? elements.edges.links.length : 0,
          mutable: false,
          label: "Linked Edges",
        },
      }));
    }
  }, [elements]);

  const onSelect: EventHandler = (e) => {
    const { id, source } = e.target[0]._private.data;

    const isNode = !source;
    if (!isNode) return;

    postVSCodeMessage({
      type: GraphViewMessageType.onSelect,
      data: { id },
      source: DMessageSource.webClient,
    } as GraphViewMessage);
  };

  return (
    <Graph
      elements={elements}
      onSelect={onSelect}
      config={config}
      setConfig={setConfig}
      engine={engine}
    />
  );
}
