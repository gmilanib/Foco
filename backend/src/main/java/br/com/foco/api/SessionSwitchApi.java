package br.com.foco.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Set;

record SessionSwitchInput(@NotBlank String previousId,double focusSeconds,@NotNull @Valid SessionInput next,String nextAction) {}

@RestController
@RequestMapping("/api/sessions")
class SessionSwitchController {
    private final SessionController sessions;
    SessionSwitchController(SessionController sessions){this.sessions=sessions;}

    @PostMapping("/switch")
    @Transactional
    public SessionRow switchSession(@Valid @RequestBody SessionSwitchInput input){
        SessionRow previous=sessions.get(input.previousId());
        if(!Set.of("Em andamento","Pausada").contains(previous.status()))
            throw new IllegalArgumentException("O apontamento anterior já foi finalizado. Atualize a tela.");
        SessionInput next=input.next();
        if(!"Em andamento".equals(next.status())||next.endAt()!=null)
            throw new IllegalArgumentException("A nova tarefa deve iniciar um apontamento em andamento.");
        SessionRow stopped=sessions.finish(previous.id(),new FinishInput("Interrompida",input.focusSeconds(),input.nextAction()));
        // One boundary for both entries; any creation failure rolls the entire switch back.
        return sessions.create(new SessionInput(next.taskId(),next.client(),next.project(),next.activity(),
                next.details(),next.consultant(),next.cardReference(),stopped.endAt(),null,
                next.plannedSeconds(),next.hourlyRate(),"Em andamento",next.category()));
    }
}
