package br.com.foco.api;

import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions/retroactive/gap")
class GapBookingController {
    private final WorkHoursController workHours;
    private final RetroactiveController retroactive;
    GapBookingController(WorkHoursController workHours,RetroactiveController retroactive){this.workHours=workHours;this.retroactive=retroactive;}
    @PostMapping @Transactional
    public SessionRow create(@Valid @RequestBody RetroactiveInput input){
        var day=input.startAt().atZoneSameInstant(WorkSchedule.ZONE).toLocalDate();
        boolean available=workHours.report(day,day).undefinedPeriods().stream().anyMatch(gap->
            !input.startAt().isBefore(gap.startAt())&&!input.endAt().isAfter(gap.endAt()));
        if(!available)throw new IllegalArgumentException("O intervalo não está mais disponível nesta lacuna. Atualize a Jornada.");
        return retroactive.create(input);
    }
}
