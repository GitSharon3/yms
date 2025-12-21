using FluentValidation;

using Yms.Core.Dtos.Yards;

namespace Yms.Application.Validation;

public sealed class UpdateYardRequestDtoValidator : AbstractValidator<UpdateYardRequestDto>
{
    public UpdateYardRequestDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Address)
            .MaximumLength(500);
    }
}
