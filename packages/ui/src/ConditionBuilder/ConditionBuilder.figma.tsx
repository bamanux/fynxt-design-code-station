import figma from "@figma/code-connect";
import { ConditionBuilder } from "./ConditionBuilder";

// DCF-0003 candidate. Work-file components: Condition Group v2 (95:7994), Condition Row (84:4954).
figma.connect(ConditionBuilder, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=95-7994", {
  example: () => (
    <ConditionBuilder
      objects={[]}
      operatorsByType={{ list: [], number: [], date: [], text: [] }}
      value={{ match: "all", items: [] }}
      onChange={() => undefined}
    />
  ),
});
