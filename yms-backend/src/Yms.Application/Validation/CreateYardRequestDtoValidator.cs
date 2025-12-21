using FluentValidation;

using Yms.Core.Dtos.Yards;

namespace Yms.Application.Validation;

public sealed class CreateYardRequestDtoValidator : AbstractValidator<CreateYardRequestDto>
{
    public CreateYardRequestDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Address)
            .MaximumLength(500);
    }
}
