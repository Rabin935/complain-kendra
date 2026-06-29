import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface OfficerWarning {
  userId: Schema.Types.ObjectId | string;
  createdByOfficerId: Schema.Types.ObjectId | string;
  reason: string;
  createdAt: Date;
}

export type OfficerWarningDocument = HydratedDocument<OfficerWarning>;
type OfficerWarningModel = Model<OfficerWarning>;

const officerWarningSchema = new Schema<OfficerWarning, OfficerWarningModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdByOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const OfficerWarningModel =
  (models.OfficerWarning as OfficerWarningModel | undefined) ??
  model<OfficerWarning, OfficerWarningModel>("OfficerWarning", officerWarningSchema);

export default OfficerWarningModel;
