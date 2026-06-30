import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  type ComplaintCategory,
  type ComplaintPriority,
} from "../types";

export interface EscalationRule {
  name: string;
  ward?: string;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
  triggerAfterHours: number;
  assignToRole: "officer" | "supervisor" | "admin";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EscalationRuleDocument = HydratedDocument<EscalationRule>;
type EscalationRuleModel = Model<EscalationRule>;

const escalationRuleSchema = new Schema<EscalationRule, EscalationRuleModel>(
  {
    name: { type: String, required: true, trim: true },
    ward: { type: String, trim: true, default: undefined, index: true },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      default: undefined,
      index: true,
    },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: undefined,
      index: true,
    },
    triggerAfterHours: { type: Number, default: 24, min: 1, required: true },
    assignToRole: {
      type: String,
      enum: ["officer", "supervisor", "admin"],
      default: "supervisor",
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const EscalationRuleModel =
  (models.EscalationRule as EscalationRuleModel | undefined) ??
  model<EscalationRule, EscalationRuleModel>(
    "EscalationRule",
    escalationRuleSchema,
  );

export default EscalationRuleModel;
