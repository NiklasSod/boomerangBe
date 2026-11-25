import type { IMessageChannel } from "../domain/ports.js";
import type { PickObserver } from "../application/DraftCoordinator.js";

/**
 * Tells human players when a pick has been submitted. The player who just
 * picked sees "Waiting for other players", while every other human still
 * deciding sees who is now waiting on them. Bot picks are silent.
 */
export class HumanPickNotifier implements PickObserver {
  constructor(
    private readonly humanChannels: ReadonlyMap<number, IMessageChannel>,
  ) {}

  async onPlayerPicked(
    playerId: number,
    waitingPlayerIds: readonly number[],
  ): Promise<void> {
    const pickerChannel = this.humanChannels.get(playerId);
    if (pickerChannel === undefined) {
      return;
    }

    let humansStillDeciding = false;
    for (const waitingId of waitingPlayerIds) {
      const channel = this.humanChannels.get(waitingId);
      if (channel === undefined) {
        continue;
      }
      humansStillDeciding = true;
      await channel.send(`Player ${playerId} is waiting for you`);
    }

    if (humansStillDeciding) {
      await pickerChannel.send("Waiting for other players");
    }
  }
}
