# Layout Engine

The goal is to build a layout engine/builder POC in pure typescript.

The engine should be able to add boxes. A box is a ui element type that wraps all other component types.
In the future, we will put things like charts and kpi elements inside these boxes.

We want to have 12 columns on our grid.

We can use a fixed height of 50px for a row.

In this POC, we will only have 2 types of components, Chart and KPI

KPI will be 3 rows high (150px) and 1 col wide by default.
Chart will be 6 rows high and 6 cols wide by default.

Components should be added by pressing a button and then picking component from a modal.

All components should float to the left by default, and should always fill in width wise if space.

All components should be resizeable down to 1 col and 1 row. All components should re-flow when something has been resized.

We want to see preview of re-flow live on drag.

Components should also be movable by drag and drop. Again show preview of re-flow.


Build this POC and make a canvas on a html page so it can be tested.