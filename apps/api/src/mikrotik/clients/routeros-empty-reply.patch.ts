import { Channel } from 'node-routeros/dist/Channel';

type ChannelPrototype = {
  onUnknown: (reply: string) => void;
  __ndtechEmptyReplyPatched?: boolean;
};

const prototype = Channel.prototype as unknown as ChannelPrototype;

if (!prototype.__ndtechEmptyReplyPatched) {
  const originalOnUnknown = prototype.onUnknown;

  prototype.onUnknown = function onUnknown(reply: string) {
    if (reply === '!empty' || reply?.trim() === '!empty') {
      // RouterOS returns !empty when a print query has no rows.
      // Resolve the pending write with an empty list instead of throwing.
      this.emit('done', []);
      return;
    }

    return originalOnUnknown.call(this, reply);
  };

  prototype.__ndtechEmptyReplyPatched = true;
}
