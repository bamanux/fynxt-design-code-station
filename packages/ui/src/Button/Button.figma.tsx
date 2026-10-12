import figma from "@figma/code-connect";
import { Button } from "./Button";

figma.connect(Button, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=62-745", {
  props: {
    variant: figma.enum("Variant", { Primary: "primary", Secondary: "secondary", Ghost: "ghost", Destructive: "destructive" }),
    size: figma.enum("Size", { S: "s", M: "m", L: "l" }),
    loading: figma.enum("State", { Loading: true }),
    disabled: figma.enum("State", { Disabled: true }),
    label: figma.string("Label"),
  },
  example: ({ variant, size, loading, disabled, label }) => (
    <Button variant={variant} size={size} loading={loading} disabled={disabled}>
      {label}
    </Button>
  ),
});
