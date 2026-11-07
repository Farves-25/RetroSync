import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeRemaining'
})
export class TimeRemainingPipe implements PipeTransform {
  transform(timerEndsAt: string | null | undefined): string {
    if (!timerEndsAt) return '--:--';

    const diff = new Date(timerEndsAt).getTime() - Date.now();
    if (diff <= 0) return "00:00 (Time's up!)";

    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  }
}

