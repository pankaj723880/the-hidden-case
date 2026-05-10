import { RevisionModel } from "../models/Revision.js";

export async function createPostRevision(post) {
  const count = await RevisionModel.countDocuments({ post: post._id });
  const revision = await RevisionModel.create({
    post: post._id,
    author: post.author,
    title: post.title,
    content: post.content,
    versionNumber: count + 1,
  });

  const oldRevisions = await RevisionModel.find({ post: post._id })
    .sort({ savedAt: -1 })
    .skip(10)
    .select("_id")
    .lean();

  if (oldRevisions.length > 0) {
    await RevisionModel.deleteMany({
      _id: { $in: oldRevisions.map((item) => item._id) },
    });
  }

  return revision;
}
