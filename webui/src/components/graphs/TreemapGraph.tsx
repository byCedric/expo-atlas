import * as echarts from 'echarts';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { Graph } from './Graph';

import type { ModuleMetadata } from '~/app/api/stats/[entry]/modules/index+api';
import { formatFileSize } from '~/utils/formatString';

type TreemapGraphProps = {
  name?: string;
  modules: ModuleMetadata[];
};

const ICON_STRINGS = {
  file: `<svg fill="white" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>`,
  dir: `<svg fill="white" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  pkg: `<svg fill="white" xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16"><path d="M440-183v-274L200-596v274l240 139Zm80 0 240-139v-274L520-457v274Zm-40-343 237-137-237-137-237 137 237 137ZM160-252q-19-11-29.5-29T120-321v-318q0-22 10.5-40t29.5-29l280-161q19-11 40-11t40 11l280 161q19 11 29.5 29t10.5 40v318q0 22-10.5 40T800-252L520-91q-19 11-40 11t-40-11L160-252Zm320-228Z"/></svg>`,
};

export function TreemapGraph(props: TreemapGraphProps) {
  const router = useRouter();

  function onInspectPath(type: 'folder' | 'module', absolutePath: string) {
    router.push({
      pathname: type === 'module' ? '/modules/[path]' : '/folders/[path]',
      params: { path: absolutePath },
    });
  }

  const { data, maxDepth, maxNodeModules } = useMemo(
    () => createModuleTree(props.modules.filter((module) => module.path.startsWith('/'))),
    [props.modules]
  );

  const getLabelObj = ({ multiLevel }: any) => ({
    show: true,
    overflow: 'truncate',
    formatter(params: any) {
      let ratioString = params.data.ratioString;
      if (!ratioString) {
        ratioString = formatFileSize(params.data.value);
      }
      return [params.name, `${ratioString}`].join(multiLevel ? '\n' : ' ');
    },
  });

  const labelObj = {
    ...getLabelObj({ multiLevel: true }),
    position: 'left',
    align: 'left',
    verticalAlign: 'middle',
  };
  const upperLabelObj = {
    ...getLabelObj({ multiLevel: false }),
  };

  return (
    <Graph
      theme="dark"
      onEvents={{
        click({ event, data }: { event: any; data: TreemapItem }) {
          const shouldFireClick = event.event.altKey || event.event.ctrlKey || event.event.metaKey;
          if (!shouldFireClick) return;
          if (data?.moduleHref) {
            onInspectPath('module', data.moduleHref);
          } else if (data?.folderHref) {
            onInspectPath('folder', data.folderHref);
          }
        },
      }}
      option={{
        backgroundColor: 'transparent',
        tooltip: {
          backgroundColor: '#000',
          borderWidth: 1,
          borderColor: '#20293A',
          padding: 0,
          textStyle: {
            color: 'white',
          },
          formatter(info: any) {
            const treePathInfo = info.treePathInfo;

            const treePath = [];

            for (let i = 1; i < treePathInfo.length; i++) {
              treePath.push(treePathInfo[i].name);
            }

            const components: string[] = [];
            const relativePath = echarts.format.encodeHTML(treePath.join('/'));

            const padding = 6;
            if ('data' in info && info.data?.tip) {
              const { data } = info;
              const sideIcon = data.isNodeModuleRoot
                ? ICON_STRINGS['pkg']
                : data.moduleHref
                  ? ICON_STRINGS['file']
                  : ICON_STRINGS['dir'];

              components.push(
                `<div style="padding:0 ${padding}px;display:flex;flex-direction:row;justify-content:space-between;">
                      <div style="display:flex;align-items:center;gap:6px">${sideIcon}
                      <span style="font-weight:${
                        data.isNodeModuleRoot ? 'bold' : 'normal'
                      };padding-right:8px;">${
                        data.isNodeModuleRoot ? data.nodeModuleName : data.name
                      }</span></div>
                      <span>${data.ratioString}</span>
                  </div>`
              );
              const divider = `<span style="width:100%;background-color:#20293A;height:1px"></span>`;
              components.push(divider);

              if (data.childCount) {
                components.push(
                  `<span style="padding:0 ${padding}px;"><b>Files:</b> ${data.childCount}</span>`
                );
              }
              components.push(
                `<span style="padding:0 ${padding}px;"><b>Size:</b> ${data.sizeString}</span>`
              );
              components.push(
                `<span style="padding:0 ${padding}px;opacity: 0.5;"><b>Path:</b> ${relativePath}</span>`
              );
              if (data.moduleHref) {
                components.push(divider);
                components.push(
                  `<span style="padding:0 ${padding}px;color:#4B86E3"><b>Open Module:</b> <kbd>⌘ + Click</kbd></span>`
                );
              } else if (data.folderHref) {
                components.push(divider);
                components.push(
                  `<span style="padding:0 ${padding}px;color:#4B86E3"><b>Open Folder:</b> <kbd>⌘ + Click</kbd></span>`
                );
              }
            } else {
              // Full bundle
              const typeName = !props.name ? 'Bundle' : props.name;
              components.push(
                `<div style="padding:0 ${padding}px;display:flex;flex-direction:row;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:6px">${ICON_STRINGS.pkg}
                        <span style="padding-right:8px;">${typeName}</span></div>
                        <span>100%</span>
                    </div>`
              );
            }
            return `<div style="display:flex;flex-direction:column;gap:${2}px;padding:${padding}px 0;">${components.join(
              ''
            )}</div>`;
          },
        },

        series: [
          {
            // roam: 'move',
            name: !props.name ? 'Bundle' : props.name,
            type: 'treemap',
            height: '85%',
            width: '95%',
            //   zoomToNodeRatio: 0.5,

            //# Colors
            colorMappingBy: 'value',
            visualDimension: 1,
            color: new Array(maxNodeModules).fill(null).map((_, index) => {
              const colors = ['#37434A', '#282A35', '#3C5056', '#263C5F', '#313158', '#4A325C'];
              return colors[index % colors.length];
            }),
            visualMin: 0,
            visualMax: maxNodeModules,

            //# Breadcrumbs
            breadcrumb: {
              show: true,
              height: 36,
              left: 32,
              top: 16,
              emptyItemWidth: 25,
              itemStyle: {
                color: '#000',
                borderColor: '#20293A',
                borderWidth: 1,
                gapWidth: 0,
                shadowColor: 'transparent',
                textStyle: {
                  color: '#96A2B5',
                  fontWeight: 'bold',
                },
              },
              emphasis: {
                itemStyle: {
                  borderWidth: 2,
                  textStyle: {
                    color: '#fff',
                    fontWeight: 'bold',
                  },
                },
              },
            },

            upperLabel: {
              // show: true,
              height: 30,
              // formatter: '{b}',
              ...upperLabelObj,
              emphasis: {
                ...upperLabelObj,
              },
            },

            itemStyle: {
              borderColor: '#fff',
              shadowColor: 'rgba(0,0,0,0.5)',
              shadowBlur: 0,
              shadowOffsetX: -0.5,
              shadowOffsetY: -0.5,
            },

            label: labelObj,

            levels: [
              {
                itemStyle: {
                  borderColor: '#353745',
                  borderWidth: 6,
                  gapWidth: 4,
                },
                upperLabel: {
                  // show: false,
                },
              },
              {
                itemStyle: {
                  borderColor: '#191A20',
                  borderWidth: 5,
                  gapWidth: 2,
                },
                emphasis: {
                  itemStyle: {
                    borderColor: '#25262B',
                  },
                },
              },
              ...new Array(maxDepth).fill(null).map(() => ({
                itemStyle: {
                  borderWidth: 2,
                  borderColorSaturation: 0.4,
                },
              })),
            ],
            data,
          },
        ],
      }}
    />
  );
}

type TreemapItem = {
  name: string;
  path: string;
  value: [number, number];
  moduleHref?: string;
  folderHref?: string;
  tip: string;
  sizeString: string;
  ratio: number;
  childCount: number;
  ratioString: string;
  children: TreemapItem[];
  nodeModuleName: string;
  isNodeModuleRoot?: boolean;
};

function createModuleTree(paths: ModuleMetadata[]): {
  data: TreemapItem[];
  maxDepth: number;
  maxNodeModules: number;
} {
  const nodeModuleIndex: { [key: string]: number } = {};
  let lastIndex = 1;
  function indexForNodeModule(moduleName: string) {
    if (nodeModuleIndex[moduleName] == null) {
      nodeModuleIndex[moduleName] = lastIndex++;
    }
    return nodeModuleIndex[moduleName];
  }

  const root: TreemapItem = {
    folderHref: '/',
    path: '/',
    children: [],
    name: '/',
    value: [0, 0],
    ratio: 0,
    childCount: 0,
    tip: '',
    sizeString: '',
    ratioString: '',
    nodeModuleName: '',
  };

  let maxDepth = 0;

  paths.forEach((pathObj) => {
    const parts = pathObj.path.split('/').filter(Boolean);
    let current = root;

    maxDepth = Math.max(maxDepth, parts.length);

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const pathFull = '/' + parts.slice(0, index + 1).join('/');

      let next = current.children.find((g) => g.path === part);

      if (!next) {
        next = {
          folderHref: pathFull,
          path: part,
          name: part,
          children: [],
          value: [0, 0],
          ratio: 0,
          childCount: 0,
          tip: '',
          sizeString: '',
          ratioString: '',
          nodeModuleName: '',
        };
        current.children.push(next);
      }

      if (isLast) {
        next.path = pathObj.path;
        next.moduleHref = pathObj.path;
        next.value = [pathObj.size, indexForNodeModule(pathObj.package ?? '[unknown]')];
        next.nodeModuleName = pathObj.package ?? '[unknown]';
      } else {
        next.value[0] += pathObj.size;
      }

      current = next;
    });
  });

  const foldNodeModuleValue = (group: TreemapItem) => {
    if (group.nodeModuleName) {
      return group.nodeModuleName;
    }

    const childNames = group.children
      .map((nm) => {
        const name = foldNodeModuleValue(nm);
        return nm.name.startsWith('node_modules') ? null : name;
      })
      .filter((name) => name != null) as string[];

    const hasTopLevelChild = group.children.some((v) => !v.children.length);

    const hasAmbiguousName = !childNames.every((v) => v === childNames[0]);

    if (hasAmbiguousName) {
      group.nodeModuleName = '';
      group.value[1] = 0; //indexForNodeModule(group.name);
    } else {
      if (hasTopLevelChild || !hasAmbiguousName) {
        group.nodeModuleName = childNames[0];
        group.isNodeModuleRoot = group.nodeModuleName === group.name;
      } else {
        group.nodeModuleName = '';
      }
      group.value[1] = indexForNodeModule(group.nodeModuleName);
    }

    return group.nodeModuleName;
  };
  foldNodeModuleValue(root);

  const foldSingleChildGroups = (group: TreemapItem) => {
    if (group.children.length === 1 && group.name !== group.nodeModuleName) {
      const child = group.children[0];
      group.value = child.value;
      group.name = group.name + '/' + child.name;
      group.path = child.path;
      group.children = child.children;
      group.moduleHref = child.moduleHref;
      group.nodeModuleName = child.nodeModuleName;

      foldSingleChildGroups(group); // recursively fold single child children
    } else {
      group.children.forEach(foldSingleChildGroups);
    }
  };
  foldSingleChildGroups(root);

  const unfoldNodeModuleNames = (group: TreemapItem) => {
    for (const child of group.children) {
      // Has children and no nodeModuleName
      if (child.children.length && !child.nodeModuleName && child.name.startsWith('@')) {
        // Split this child into multiple sub children
        for (const subChild of child.children) {
          const name = child.name + '/' + subChild.name;
          group.children.push({
            ...subChild,
            isNodeModuleRoot: name === subChild.nodeModuleName,
            name,
            path: child.path + '/' + subChild.path,
          });
        }
        // Remove the original child
        group.children.splice(group.children.indexOf(child), 1);
      }
    }

    group.children.forEach(unfoldNodeModuleNames);
  };
  unfoldNodeModuleNames(root);

  // Recalculate the node modules value (#2) relative to the size of the node module overall.
  // First we need to calculate the total size of each node module
  const nodeModuleSizes: { [key: string]: number } = {};

  const getNodeModuleSizesMap = (group: TreemapItem) => {
    if (group.nodeModuleName && !nodeModuleSizes[group.nodeModuleName]) {
      nodeModuleSizes[group.nodeModuleName] = group.value[0];
    }

    group.children.forEach(getNodeModuleSizesMap);
  };
  getNodeModuleSizesMap(root);

  const sizes = Object.entries(nodeModuleSizes).sort((a, b) => b[1] - a[1]);

  const recalculateNodeModuleSizesValue = (group: TreemapItem) => {
    const size = sizes.findIndex(([name]) => name === group.nodeModuleName);
    group.value[1] = size + 1;

    group.children.forEach(recalculateNodeModuleSizesValue);
  };
  recalculateNodeModuleSizesValue(root);

  root.value[0] = root.children.reduce((acc, g) => acc + g.value[0], 0);

  const calculateRatio = (group: TreemapItem) => {
    group.ratio = group.value[0] / root.value[0];
    group.children.forEach(calculateRatio);
  };
  calculateRatio(root);

  // Calculate the ratio of each group
  const calculateTooltip = (group: TreemapItem) => {
    const percentage = group.ratio * 100;
    let percetageString = percentage.toFixed(2) + '%';
    if (percentage <= 0.01) {
      percetageString = '< 0.01%';
    }

    const size = formatFileSize(group.value[0]);
    group.ratioString = percetageString;
    group.tip = percetageString + ' (' + size + ')';
    group.sizeString = size;
    group.children.forEach(calculateTooltip);
  };

  calculateTooltip(root);

  const calculateChildCount = (group: TreemapItem): number => {
    group.childCount = group.children.reduce((acc, v) => acc + calculateChildCount(v), 0);
    return group.childCount + (group.children.length ? 0 : 1);
  };
  calculateChildCount(root);

  return { data: root.children, maxDepth, maxNodeModules: lastIndex };
}
